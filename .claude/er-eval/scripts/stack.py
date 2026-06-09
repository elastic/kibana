# HTTP client for Kibana + Elasticsearch, fixture seeding, and provenance reads.

import base64
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

PUBLIC_V1 = "2023-10-31"
INTERNAL_V2 = "2"
DEFAULT_INFERENCE_ID = ".jina-embeddings-v5-text-small"
LATEST_INDEX = "entities-latest-default"
RULE_MAINTAINER = "automated-resolution"
EMBEDDING_MAINTAINER = "embedding-resolution"

RES = "entity.relationships.resolution"
PROVENANCE_SOURCE_FIELDS = [
    "entity.id",
    f"{RES}.resolved_to",
    f"{RES}.resolved_by",
    f"{RES}.effective_to",
]


class ApiError(Exception):
    def __init__(self, method, url, status, body):
        self.status = status
        super().__init__(f"{method} {url} -> HTTP {status}: {body}")


def _maybe_json(text):
    text = text.strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


class Stack:
    def __init__(self, kibana, es, auth, timeout=600):
        self.kibana = kibana.rstrip("/")
        self.es = es.rstrip("/")
        self._auth = "Basic " + base64.b64encode(auth.encode()).decode("ascii")
        self.timeout = timeout

    def _request(self, method, url, headers=None, data=None, raw=False):
        hdrs = {"Authorization": self._auth}
        if headers:
            hdrs.update(headers)
        body = None
        if data is not None:
            if raw:
                body = data.encode() if isinstance(data, str) else data
            else:
                body = json.dumps(data).encode()
                hdrs.setdefault("Content-Type", "application/json")
        req = urllib.request.Request(url, data=body, method=method, headers=hdrs)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return resp.status, _maybe_json(resp.read().decode())
        except urllib.error.HTTPError as e:
            raise ApiError(method, url, e.code, _maybe_json(e.read().decode("utf-8", "replace"))) from None

    def kbn(self, method, path, version=None, data=None, query=None):
        url = self.kibana + path + ("?" + urllib.parse.urlencode(query) if query else "")
        headers = {"kbn-xsrf": "1", "x-elastic-internal-origin": "kibana"}
        if version:
            headers["elastic-api-version"] = version
        return self._request(method, url, headers=headers, data=data)

    def es_req(self, method, path, data=None, ndjson=False, query=None):
        url = self.es + path + ("?" + urllib.parse.urlencode(query) if query else "")
        headers = {"Content-Type": "application/x-ndjson"} if ndjson else {}
        return self._request(method, url, headers=headers, data=data, raw=ndjson)

    def enable_v2_flag(self):
        return self.kbn("POST", "/api/kibana/settings/securitySolution:entityStoreEnableV2",
                        data={"value": True})

    def install(self):
        return self.kbn("POST", "/api/security/entity_store/install", version=PUBLIC_V1, data={})

    def status(self):
        return self.kbn("GET", "/api/security/entity_store/status", version=PUBLIC_V1)

    def init_maintainers(self):
        return self.kbn("POST", "/internal/security/entity_store/entity_maintainers/init",
                        version=INTERNAL_V2, data={})

    def link_entities(self, target_id, entity_ids):
        return self.kbn("POST", "/api/security/entity_store/resolution/link", version=PUBLIC_V1,
                        data={"target_id": target_id, "entity_ids": entity_ids})

    def unlink_entities(self, entity_ids):
        return self.kbn("POST", "/api/security/entity_store/resolution/unlink", version=PUBLIC_V1,
                        data={"entity_ids": entity_ids})

    def run_maintainer_sync(self, maintainer_id):
        return self.kbn("POST", f"/internal/security/entity_store/entity_maintainers/run/{maintainer_id}",
                        version=INTERNAL_V2, data={}, query={"sync": "true"})

    def bulk(self, ndjson_body):
        return self.es_req("POST", "/_bulk", data=ndjson_body, ndjson=True, query={"refresh": "wait_for"})

    def search(self, index, body):
        return self.es_req("POST", f"/{index}/_search", data=body)

    def delete_by_query(self, index, body):
        return self.es_req("POST", f"/{index}/_delete_by_query", data=body, query={"refresh": "true"})

    def invoke_llm(self, messages, connector_id="openai-connector"):
        # .inference connectors use unified_completion; .gen-ai use invokeAI
        if connector_id.startswith("."):
            params = {"subAction": "unified_completion",
                      "subActionParams": {"body": {"messages": messages}}}
        else:
            params = {"subAction": "invokeAI", "subActionParams": {"messages": messages}}
        _, body = self.kbn("POST", f"/api/actions/connector/{connector_id}/_execute",
                           data={"params": params})
        if isinstance(body, dict) and body.get("status") == "ok":
            data = body.get("data") or {}
            if "choices" in data:  # unified_completion
                return (((data["choices"] or [{}])[0]).get("message") or {}).get("content", "")
            return data.get("message", "")  # invokeAI
        raise RuntimeError(f"connector '{connector_id}' execute failed: {body}")

    def infer(self, inputs, inference_id=DEFAULT_INFERENCE_ID):
        _, body = self.es_req("POST", f"/_inference/text_embedding/{urllib.parse.quote(inference_id)}",
                              data={"input": inputs})
        embeddings = (body or {}).get("text_embedding")
        if not isinstance(embeddings, list):
            raise RuntimeError(f"inference '{inference_id}' returned no embeddings: {body}")
        return [e["embedding"] for e in embeddings]


# ---- seeding ----------------------------------------------------------------

def _now_iso():
    n = datetime.now(timezone.utc)
    return n.strftime("%Y-%m-%dT%H:%M:%S.") + f"{n.microsecond // 1000:03d}Z"


def _doc_id(entity_id):
    return hashlib.sha256(entity_id.encode()).hexdigest()


def _set_dotted(root, dotted_key, value):
    parts = dotted_key.split(".")
    node = root
    for p in parts[:-1]:
        node = node.setdefault(p, {})
    node[parts[-1]] = value


def build_doc(entity, ts):
    eid = entity["entityId"]
    source = {
        "@timestamp": ts,
        "entity": {
            "id": eid,
            "name": eid,
            "EngineMetadata": {"Type": entity.get("type", "user")},
            "namespace": entity.get("namespace", "unknown"),
            "lifecycle": {"first_seen": ts, "last_seen": ts},
        },
    }
    for dotted, value in entity.get("fields", {}).items():
        _set_dotted(source, dotted, value)
    return source


def build_ndjson(entities, ts=None):
    ts = ts or _now_iso()
    lines = []
    for e in entities:
        lines.append(json.dumps({"index": {"_index": LATEST_INDEX, "_id": _doc_id(e["entityId"])}}))
        lines.append(json.dumps(build_doc(e, ts)))
    return "\n".join(lines) + "\n"


def wipe(stack, log):
    log("  wiping prior er-* fixtures ...")
    stack.delete_by_query(LATEST_INDEX, {"query": {"prefix": {"entity.id": "er-"}}})


def seed_entities(stack, entities, log, ts=None):
    if not entities:
        return
    _, body = stack.bulk(build_ndjson(entities, ts=ts))
    if isinstance(body, dict) and body.get("errors"):
        first = next((it for it in body.get("items", []) if list(it.values())[0].get("error")), None)
        raise RuntimeError(f"bulk indexing errors; first: {first}")
    log(f"  bulk-seeded {len(entities)} entities")


def reset_resolution(stack, entity_ids, log):
    # clear any auto-resolution so manual links apply to a clean slate
    if not entity_ids:
        return
    try:
        stack.unlink_entities(entity_ids)
        log(f"  reset resolution on {len(entity_ids)} entities")
    except ApiError as e:
        log(f"  reset warning: {e}")
    time.sleep(1)


def post_manual_links(stack, manual_links, log):
    for ml in manual_links:
        try:
            stack.link_entities(ml["targetId"], ml["entityIds"])
            log(f"  manual link {ml['entityIds']} -> {ml['targetId']}")
        except ApiError as e:
            log(f"  ! manual link {ml['entityIds']} -> {ml['targetId']} skipped: {e}")


# ---- provenance -------------------------------------------------------------

def _dig(source, dotted):
    node = source
    for part in dotted.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


def collect_provenance(stack, prefix="er-", size=500):
    body = {"size": size, "_source": PROVENANCE_SOURCE_FIELDS,
            "query": {"prefix": {"entity.id": prefix}}}
    _, resp = stack.search(LATEST_INDEX, body)
    out = {}
    for hit in (resp.get("hits", {}).get("hits", []) if isinstance(resp, dict) else []):
        src = hit.get("_source", {})
        eid = _dig(src, "entity.id")
        if not eid:
            continue
        out[eid] = {
            "resolved_to": _dig(src, f"{RES}.resolved_to"),
            "resolved_by": _dig(src, f"{RES}.resolved_by"),
            "effective_to": _dig(src, f"{RES}.effective_to"),
        }
    return out

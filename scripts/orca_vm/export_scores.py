#!/usr/bin/env python3
"""Export persona-matrix scores from LOCAL ES on the VM to golden.

Reads local ES (port 9220, elastic:changeme) for the persona-matrix dataset,
then bulk-indexes to golden with create semantics (idempotent retries).
"""
import json
import os
import sys
import urllib.request

GOLDEN_URL = os.environ.get("GOLDEN_ES_URL", "").rstrip("/")
GOLDEN_KEY = os.environ.get("GOLDEN_ES_API_KEY", "")
LOCAL_ES = "http://localhost:9220"
LOCAL_AUTH = "Basic ZWxhc3RpYzpjaGFuZ2VtZQ=="  # elastic:changeme

DATASET = "f2db90e6-cb7f-58f2-b862-1b69e47f6a77"  # persona-matrix
INDEX = ".evaluation-scores"


def es_local(path, body=None):
    req = urllib.request.Request(
        f"{LOCAL_ES}{path}",
        data=json.dumps(body).encode() if body else None,
        headers={"Content-Type": "application/json", "Authorization": LOCAL_AUTH},
        method="POST" if body else "GET",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def export_model(model_id: str):
    # Every sweep VM starts from a clean ES data directory and runs exactly one
    # model. Export the complete persona-matrix dataset instead of guessing the
    # stored model ID from the connector ID: connector IDs use hyphens
    # (google-gemini-3-1-pro), while score docs use dots
    # (google-gemini-3.1-pro). The dataset filter is the stable identity.
    body = {
        "size": 10000,
        "query": {"term": {"example.dataset.id": DATASET}},
    }
    resp = es_local(f"/{INDEX}/_search", body)
    hits = resp.get("hits", {}).get("hits", [])
    if not hits:
        sys.stderr.write(f"no local persona-matrix docs for {model_id}\n")
        return 0

    stored_models = {
        h.get("_source", {}).get("task", {}).get("model", {}).get("id") for h in hits
    }
    stored_models.discard(None)
    if len(stored_models) != 1:
        raise RuntimeError(
            f"expected one model on clean VM, found {sorted(stored_models)}"
        )

    # Preserve IDs and use create so retries are idempotent. Version conflicts
    # mean the document already landed and are not export failures.
    bulk_lines = []
    for h in hits:
        bulk_lines.append(
            json.dumps({"create": {"_index": INDEX, "_id": h["_id"]}})
        )
        bulk_lines.append(json.dumps(h["_source"]))
    bulk_body = "\n".join(bulk_lines) + "\n"
    req = urllib.request.Request(
        f"{GOLDEN_URL}/{INDEX}/_bulk",
        data=bulk_body.encode(),
        headers={
            "Authorization": f"ApiKey {GOLDEN_KEY}",
            "Content-Type": "application/x-ndjson",
            "kbn-xsrf": "kbn-client",
            "x-elastic-internal-origin": "kbn-client",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        result = json.loads(r.read())
    failed_items = []
    for item in result.get("items", []):
        op = item.get("create", {})
        status = int(op.get("status", 500))
        if status not in (201, 409):
            failed_items.append(op)
    if failed_items:
        sys.stderr.write(
            f"export failed for {len(failed_items)}/{len(hits)} docs; "
            f"first={failed_items[0]}\n"
        )
        return 0
    sys.stderr.write(
        f"exported {len(hits)} docs for {model_id} "
        f"(models={sorted(stored_models)}, idempotent_conflicts_ok)\n"
    )
    return len(hits)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: export_scores.py <eis-model-id>")
    model = sys.argv[1]
    count = export_model(model)
    raise SystemExit(0 if count == 252 else 1)

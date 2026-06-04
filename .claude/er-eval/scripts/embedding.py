# Offline embedding mirror of the embedding-resolution maintainer.

import json
import re
from itertools import combinations

INFERENCE_BATCH_SIZE = 16
DEFAULT_NUM_CANDIDATES = 100
EXPERIMENT_INDEX = "er-eval-experiment"

ROLE_ACCOUNT_LOCAL_PARTS = {
    "noreply", "no-reply", "admin", "helpdesk", "support", "info",
    "automation", "system", "root", "service",
}
ROLE_ACCOUNT_FULL_NAME_TOKENS = {"service", "bot", "pipeline", "monitor", "automation"}


def _field_value_to_str(value):
    if isinstance(value, list):
        return " ".join(str(v) for v in value)
    return str(value)


def label_for(key):
    # strip leading 'user.' so a user.* recipe matches the maintainer's labels
    return key[len("user."):] if key.startswith("user.") else key


def build_identity_string(fields, recipe):
    parts = []
    for key in recipe:
        if key not in fields:
            continue
        norm = _field_value_to_str(fields[key]).strip().lower()
        if norm:
            parts.append(f"{label_for(key)}: {norm}")
    return "; ".join(parts)


def build_identity_strings(fx, recipe, include_ids=None):
    ids = fx.user_ids()
    if include_ids is not None:
        ids = [e for e in ids if e in include_ids]
    strings = {}
    present = set()
    for eid in ids:
        f = fx.fields(eid)
        present.update(f.keys())
        s = build_identity_string(f, recipe)
        if s:
            strings[eid] = s
    return strings, [k for k in recipe if k not in present]


def is_role_account(fields):
    raw = fields.get("user.email")
    if isinstance(raw, list):
        raw = raw[0] if raw else ""
    email = str(raw or "").strip()
    if email:
        local = email.split("@", 1)[0].lower()
        tokens = [local] + [t for t in re.split(r"[.\-_]+", local) if t]
        if any(t in ROLE_ACCOUNT_LOCAL_PARTS for t in tokens):
            return True
    full = str(fields.get("user.full_name") or "").strip()
    return bool(full) and any(t in ROLE_ACCOUNT_FULL_NAME_TOKENS for t in full.lower().split())


def embed_strings(stack, strings, inference_id):
    eids = list(strings.keys())
    vectors = {}
    for i in range(0, len(eids), INFERENCE_BATCH_SIZE):
        batch = eids[i:i + INFERENCE_BATCH_SIZE]
        for eid, vec in zip(batch, stack.infer([strings[e] for e in batch], inference_id=inference_id)):
            vectors[eid] = vec
    return vectors


def reset_vector_index(stack, dims, index=EXPERIMENT_INDEX):
    try:
        stack.es_req("DELETE", f"/{index}")
    except Exception:
        pass
    mapping = {"mappings": {"properties": {"entity": {"properties": {
        "id": {"type": "keyword"},
        "EngineMetadata": {"properties": {"Type": {"type": "keyword"}}},
        "resolution": {"properties": {"embedding": {
            "type": "dense_vector", "dims": dims, "index": True, "similarity": "cosine"}}},
    }}}}}
    stack.es_req("PUT", f"/{index}", data=mapping)


def index_vectors(stack, vectors, types, index=EXPERIMENT_INDEX):
    lines = []
    for eid, vec in vectors.items():
        lines.append(json.dumps({"index": {"_index": index, "_id": eid}}))
        lines.append(json.dumps({"entity": {
            "id": eid, "EngineMetadata": {"Type": types.get(eid, "user")},
            "resolution": {"embedding": vec}}}))
    stack.es_req("POST", "/_bulk", data="\n".join(lines) + "\n", ndjson=True, query={"refresh": "wait_for"})


def knn_candidates(stack, query_vector, exclude_id, k, num_candidates, index=EXPERIMENT_INDEX):
    # ES cosine _score = (1 + cosine) / 2, same scale as the threshold
    body = {"size": k, "_source": ["entity.id"], "knn": {
        "field": "entity.resolution.embedding", "query_vector": query_vector,
        "k": k, "num_candidates": num_candidates,
        "filter": [{"term": {"entity.EngineMetadata.Type": "user"}},
                   {"bool": {"must_not": {"term": {"entity.id": exclude_id}}}}]}}
    _, resp = stack.search(index, body)
    out = []
    for hit in (resp.get("hits", {}).get("hits", []) if isinstance(resp, dict) else []):
        cid = (((hit.get("_source") or {}).get("entity")) or {}).get("id")
        if cid is not None and hit.get("_score") is not None:
            out.append((cid, hit["_score"]))
    return out


class _UnionFind:
    def __init__(self, items):
        self.parent = {x: x for x in items}

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[ra] = rb


def cluster_via_knn(stack, vectors, role_ids, threshold, k, num_candidates=DEFAULT_NUM_CANDIDATES,
                    index=EXPERIMENT_INDEX):
    eids = sorted(vectors.keys())
    uf = _UnionFind(eids)
    for e in eids:
        if e in role_ids:
            continue
        cands = [(c, s) for (c, s) in knn_candidates(stack, vectors[e], e, k, num_candidates, index)
                 if c not in role_ids]
        if not cands:
            continue
        cands.sort(key=lambda cs: cs[1], reverse=True)
        top_id, top_score = cands[0]
        if top_score < threshold:
            continue
        if len(cands) >= 2 and cands[1][1] == top_score:
            continue  # ambiguity guard
        uf.union(e, top_id)
    groups = {}
    for e in eids:
        groups.setdefault(uf.find(e), []).append(e)
    predicted_pairs = set()
    for members in groups.values():
        if len(members) > 1:
            for a, b in combinations(sorted(members), 2):
                predicted_pairs.add((a, b))
    return predicted_pairs

#!/usr/bin/env bash
# Seed Entity Analytics sample entities with distinct risk levels for flyout + graph colors.
# Also seeds risk-score indices so the flyout Lens metric shows numbers/colors (not NA).
#
# KEEP THESE EXAMPLES — they are the permanent local design fixtures for risk badge colors:
#   Critical · High · Moderate · Low · Unknown
#
# Entities live in Elasticsearch — they are NOT in git. Re-run after every fresh
# `yarn es snapshot` (or anytime the Entity risk levels donut shows all Unknown).
#
# Why they get wiped: the risk engine's reset-to-zero task zeroes scores that have
# no recent alert inputs, rewriting entity.risk to Unknown/0 (host.risk can linger).
# Local kibana.dev.yml disables that via disable:enableRiskScoreResetToZero.
#
#   bash scripts/seed-entity-analytics-sample.sh
#
# Demo URLs (Mock IdP → admin):
#   Table:   http://localhost:5601/app/security/entity_analytics_home_page
#   Flyout:  http://localhost:5601/app/security/entity_analytics_home_page?flyout=%28right%3A%28id%3Ahost-panel%2Cparams%3A%28contextID%3Aentity-analytics-home-table%2ChostName%3Amacbook-john-work%2CisPreviewMode%3A%21f%2CscopeId%3Aentity-analytics-home-table%29%29%29
#   No seed: http://localhost:5601/app/security/dev-graph  (mock graph + flyout open)
set -euo pipefail

ES_URL="${ES_URL:-http://localhost:9200}"
ES_USER="${ES_USER:-elastic}"
ES_PASS="${ES_PASS:-changeme}"
AUTH=(-u "${ES_USER}:${ES_PASS}")

# Prefer V2 entity store alias when present
if curl -s -o /dev/null -w "%{http_code}" "${AUTH[@]}" "${ES_URL}/.entities.v2.latest.security_default-00001" | grep -q 200; then
  curl -s "${AUTH[@]}" -X POST "${ES_URL}/_aliases" -H 'Content-Type: application/json' -d '{
    "actions": [
      { "remove": { "index": "*", "alias": "entities-latest-default", "must_exist": false } },
      { "add": { "index": ".entities.v2.latest.security_default-00001", "alias": "entities-latest-default" } }
    ]
  }' >/dev/null || true
  ENTITY_INDEX=".entities.v2.latest.security_default-00001"
else
  curl -s "${AUTH[@]}" -X POST "${ES_URL}/_aliases" -H 'Content-Type: application/json' -d '{
    "actions": [
      { "add": { "index": ".entities.v1.latest.security_host_default", "alias": "entities-latest-default" } },
      { "add": { "index": ".entities.v1.latest.security_user_default", "alias": "entities-latest-default" } },
      { "add": { "index": ".entities.v1.latest.security_service_default", "alias": "entities-latest-default" } }
    ]
  }' >/dev/null || true
  ENTITY_INDEX="entities-latest-default"
fi

NOW="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
FIRST_SEEN="2026-07-07T11:08:49.357Z"

# Clear previous sample entity docs (by id pattern / known names)
curl -s "${AUTH[@]}" -X POST "${ES_URL}/${ENTITY_INDEX}/_delete_by_query?refresh=true&conflicts=proceed" \
  -H 'Content-Type: application/json' -d '{
  "query": {
    "terms": {
      "entity.name": [
        "edge-sec-ubuntu-2004-obtc-estec-0",
        "macbook-john-work",
        "admin-pc",
        "john-pc-home",
        "low-risk-host",
        "guest-unknown",
        "john.doe",
        "alice",
        "auth-service"
      ]
    }
  }
}' >/dev/null || true

# Clear previous sample risk docs
for RISK_IDX in risk-score.risk-score-default risk-score.risk-score-latest-default; do
  curl -s "${AUTH[@]}" -X POST "${ES_URL}/${RISK_IDX}/_delete_by_query?refresh=true&conflicts=proceed" \
    -H 'Content-Type: application/json' -d '{
    "query": {
      "bool": {
        "should": [
          {"terms": {"host.risk.id_value": [
            "host:9e4316b8589de4d3dd3cc8c4658f11dc",
            "host:macbook-john-work",
            "host:admin-pc",
            "host:john-pc-home",
            "host:low-risk-host",
            "host:guest-unknown"
          ]}},
          {"terms": {"user.risk.id_value": ["user:john.doe", "user:alice"]}},
          {"terms": {"service.risk.id_value": ["service:auth-service"]}}
        ],
        "minimum_should_match": 1
      }
    }
  }' >/dev/null || true
done

BULK="$(mktemp)"
python3 - "$NOW" "$FIRST_SEEN" "$BULK" "$ENTITY_INDEX" <<'PY'
import json, sys, hashlib
from datetime import datetime, timedelta, timezone

now_s, first, path, entity_index = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
now = datetime.fromisoformat(now_s.replace("Z", "+00:00"))

def hash_euid(euid: str) -> str:
  return hashlib.sha256(euid.encode()).hexdigest()

# (entity_type, entity_id, name, score, level, extra_entity_fields)
entities = [
  ("host", "host:9e4316b8589de4d3dd3cc8c4658f11dc", "edge-sec-ubuntu-2004-obtc-estec-0", 98.72, "Critical", {
    "host": {"name": "edge-sec-ubuntu-2004-obtc-estec-0", "id": "9e4316b8589de4d3dd3cc8c4658f11dc",
             "ip": ["10.128.0.66", "10.128.0.67", "10.128.0.68", "10.128.0.69", "10.128.0.70"]},
    "entity_extra": {
      "source": ["elastic_agent", "endpoint", "system", "auditd", "filebeat", "packetbeat", "osquery", "cloud_defend"],
      "lifecycle": {"First_seen": first, "Last_activity": now_s},
    },
  }),
  ("host", "host:macbook-john-work", "macbook-john-work", 90.01, "Critical", {
    "host": {"name": "macbook-john-work", "ip": ["10.128.0.93"]},
    "entity_extra": {"source": ["elastic_agent"]},
    "asset": {"criticality": "high_impact"},
  }),
  ("host", "host:admin-pc", "admin-pc", 75.0, "High", {
    "host": {"name": "admin-pc", "ip": ["10.128.0.12"]},
    "entity_extra": {"source": ["elastic_agent"]},
  }),
  ("host", "host:john-pc-home", "john-pc-home", 55.0, "Moderate", {
    "host": {"name": "john-pc-home", "ip": ["192.168.1.20"]},
    "entity_extra": {"source": ["elastic_agent"]},
  }),
  ("host", "host:low-risk-host", "low-risk-host", 25.0, "Low", {
    "host": {"name": "low-risk-host", "ip": ["10.128.0.20"]},
    "entity_extra": {"source": ["elastic_agent"]},
  }),
  ("host", "host:guest-unknown", "guest-unknown", 12.0, "Unknown", {
    "host": {"name": "guest-unknown", "ip": ["10.128.0.40"]},
    "entity_extra": {"source": ["elastic_agent"]},
  }),
  ("user", "user:john.doe", "john.doe", 95.5, "Critical", {
    "user": {"name": "john.doe"},
    "entity_extra": {"source": ["okta"]},
  }),
  ("user", "user:alice", "alice", 42.0, "Moderate", {
    "user": {"name": "alice"},
    "entity_extra": {"source": ["okta"]},
  }),
  ("service", "service:auth-service", "auth-service", 78.0, "High", {
    "service": {"name": "auth-service"},
    "entity_extra": {"source": ["kubernetes"]},
  }),
]

# Historical score trail for Lens trendline (last ~2 weeks)
def history_points(score: float):
  pts = []
  for days_ago, factor in [(14, 0.55), (10, 0.68), (7, 0.78), (4, 0.88), (2, 0.95), (0, 1.0)]:
    ts = (now - timedelta(days=days_ago)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    pts.append((ts, round(min(100.0, score * factor), 2)))
  return pts

with open(path, "w") as f:
  for etype, eid, name, score, level, meta in entities:
    risk_fields = {
      "calculated_score": score,
      "calculated_score_norm": score,
      "calculated_level": level,
    }
    # --- Entity store doc ---
    # Write risk on BOTH entity.risk and {host|user|service}.risk.
    # Entity Store V2 copies type-prefixed risk → entity.risk; if only
    # entity.risk is set, collect/enrich tasks rewrite it to Unknown/0.
    entity_doc = {
      "@timestamp": now_s,
      "entity": {
        "id": eid,
        "name": name,
        "type": etype.capitalize() if entity_index.startswith(".entities.v2") else etype,
        "EngineMetadata": {"Type": etype},
        "risk": risk_fields,
        **meta.get("entity_extra", {}),
      },
    }
    type_block = dict(meta.get(etype, {}))
    type_block["risk"] = {
      **risk_fields,
      "id_field": "entity.id",
      "id_value": eid,
      "score_type": "base",
    }
    entity_doc[etype] = type_block
    if "asset" in meta:
      entity_doc["asset"] = meta["asset"]

    doc_id = hash_euid(eid) if entity_index.startswith(".entities.v2") else eid
    f.write(json.dumps({"index": {"_index": entity_index, "_id": doc_id}}) + "\n")
    f.write(json.dumps(entity_doc) + "\n")

    # --- Risk score latest ---
    risk_block = {
      "id_field": "entity.id",
      "id_value": eid,
      "score_type": "base",
      "calculated_level": level,
      "calculated_score": score,
      "calculated_score_norm": score,
      "category_1_score": score,
      "category_1_count": max(1, int(score // 10)),
      "notes": [],
      "modifiers": [],
      "inputs": [
        {
          "id": f"alert-{etype}-{name}",
          "index": ".alerts-security.alerts-default",
          "category": "category_1",
          "description": "Sample alert contributing to risk",
          "risk_score": min(100.0, score),
          "timestamp": now_s,
        }
      ],
    }
    latest_doc = {"@timestamp": now_s, etype: {"name": name, "risk": risk_block}}
    f.write(json.dumps({"index": {"_index": "risk-score.risk-score-latest-default", "_id": eid}}) + "\n")
    f.write(json.dumps(latest_doc) + "\n")

    # --- Risk score history (data stream) for Lens metric + trendline ---
    for ts, hist_score in history_points(score):
      hist_level = (
        "Critical" if hist_score >= 90 else
        "High" if hist_score >= 70 else
        "Moderate" if hist_score >= 40 else
        "Low"
      )
      hist_block = {
        **risk_block,
        "calculated_level": hist_level if ts != now_s else level,
        "calculated_score": hist_score,
        "calculated_score_norm": hist_score,
        "category_1_score": hist_score,
      }
      hist_doc = {"@timestamp": ts, etype: {"name": name, "risk": hist_block}}
      # data stream: create op without custom _id
      f.write(json.dumps({"create": {"_index": "risk-score.risk-score-default"}}) + "\n")
      f.write(json.dumps(hist_doc) + "\n")
PY

curl -s "${AUTH[@]}" -X POST "${ES_URL}/_bulk?refresh=true" \
  -H 'Content-Type: application/x-ndjson' --data-binary @"${BULK}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
errs=[i for i in d.get('items',[]) if list(i.values())[0].get('error')]
print(f\"bulk errors: {len(errs)} / {len(d.get('items',[]))}\")
if errs[:3]:
  print(json.dumps(errs[:3], indent=2))
"
rm -f "${BULK}"

# Disable risk-engine reset-to-zero (maintainer + legacy). The experimental
# `disable:enableRiskScoreResetToZero` flag is not enough — maintainer defaults
# enableResetToZero to true and rewrites entity.risk → Unknown/0 within seconds.
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
curl -s -u "${ES_USER}:${ES_PASS}" -X PUT \
  "${KIBANA_URL}/api/risk_score/engine/saved_object/configure" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: Kibana' \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{"enable_reset_to_zero": false}' >/tmp/risk-reset-cfg.json || true
python3 -c "
import json
try:
  d=json.load(open('/tmp/risk-reset-cfg.json'))
  print('reset-to-zero configure:', json.dumps(d)[:300])
except Exception as e:
  print('reset-to-zero configure: skipped/failed', e)
"

# Enable Entity Store V2 UI setting (needed for Visualizations / Graph preview in flyout)
curl -s -u kibana_system:changeme -X POST \
  "${ES_URL}/.kibana_9.5.0_001/_update/config%3A9.5.0?refresh=true" \
  -H 'Content-Type: application/json' -d '{
  "doc": { "config": { "securitySolution:entityStoreEnableV2": true } }
}' >/dev/null || true

echo ""
echo "Entity store risk ladder:"
ENTITY_LADDER_JSON="$(curl -s "${AUTH[@]}" "${ES_URL}/entities-latest-default/_search?size=20" -H 'Content-Type: application/json' -d '{
  "sort":[{"entity.risk.calculated_score_norm":"desc"}],
  "_source":["entity.name","entity.risk","host.risk","user.risk","service.risk"]
}')"
python3 -c "
import json,sys
d=json.loads(sys.argv[1])
hits=d.get('hits',{}).get('hits',[])
by_name={}
for h in hits:
  s=h['_source']; e=s.get('entity',{}); er=e.get('risk') or {}
  tr={}
  for t in ('host','user','service'):
    if t in s and isinstance(s[t], dict) and s[t].get('risk'):
      tr=s[t]['risk']; break
  # Prefer a positive score from entity.risk or typed risk (host/user/service).
  candidates=[er, tr]
  best=None
  for r in candidates:
    score=r.get('calculated_score_norm')
    if score is not None and float(score) > 0:
      best=r; break
  if best is None:
    best=er or tr
  name=e.get('name')
  by_name[name]=(best.get('calculated_level'), best.get('calculated_score_norm'))
  print(f\"  {best.get('calculated_level','?'):10} {best.get('calculated_score_norm','?'):5}  {name}  (entity={er.get('calculated_score_norm')}, typed={tr.get('calculated_score_norm')})\")

required = {
  'edge-sec-ubuntu-2004-obtc-estec-0': ('Critical', 98.72),
  'macbook-john-work': ('Critical', 90.01),
  'admin-pc': ('High', 75.0),
  'john-pc-home': ('Moderate', 55.0),
  'low-risk-host': ('Low', 25.0),
  'guest-unknown': ('Unknown', 12.0),
}
missing=[]
for name,(level,score) in required.items():
  got=by_name.get(name)
  if not got or got[0]!=level or float(got[1])!=float(score):
    missing.append(f\"{name}: expected {level} {score}, got {got}\")
if missing:
  print('VERIFY FAILED — entity store ladder incomplete:')
  for m in missing:
    print(f'  - {m}')
  sys.exit(1)
print('VERIFY OK — Critical→Unknown fixtures present in entity store.')
" "${ENTITY_LADDER_JSON}"

echo ""
echo "Risk-score latest (flyout Lens / table source):"
RISK_LATEST_JSON="$(curl -s "${AUTH[@]}" "${ES_URL}/risk-score.risk-score-latest-default/_search?size=20" -H 'Content-Type: application/json' -d '{
  "query": {"match_all": {}},
  "_source": ["host.name","host.risk","user.name","user.risk","service.name","service.risk"]
}')"
python3 -c "
import json,sys
d=json.loads(sys.argv[1])
by_name={}
for h in d.get('hits',{}).get('hits',[]):
  s=h['_source']
  for k in ('host','user','service'):
    if k in s and 'risk' in s[k]:
      r=s[k]['risk']
      name=s[k].get('name')
      by_name[name]=(r.get('calculated_level'), r.get('calculated_score_norm'))
      print(f\"  {r.get('calculated_level','?'):10} {r.get('calculated_score_norm','?'):5}  {name}  id={r.get('id_value')}\")

required = {
  'edge-sec-ubuntu-2004-obtc-estec-0': ('Critical', 98.72),
  'macbook-john-work': ('Critical', 90.01),
}
missing=[]
for name,(level,score) in required.items():
  got=by_name.get(name)
  if not got or got[0]!=level or float(got[1])!=float(score):
    missing.append(f\"{name}: expected {level} {score}, got {got}\")
if missing:
  print('VERIFY FAILED — risk-score-latest incomplete:')
  for m in missing:
    print(f'  - {m}')
  sys.exit(1)
print('VERIFY OK — flyout Lens sources present for Critical hosts.')
" "${RISK_LATEST_JSON}"

echo ""
echo "Open http://localhost:5601/app/security/entity_analytics_home_page"
echo "Hard refresh the flyout — Entity risk score should show colored numbers (not NA)."

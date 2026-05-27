#!/usr/bin/env bash
#
# Seed the 10-case Entity Resolution v2 PoC dataset documented in
# .claude/er-v2-9.4-audit.md §4 into a running local Kibana + Elasticsearch.
#
# Idempotent and re-runnable:
#   - Bulk seed uses deterministic doc _ids (sha256 of entityId), so re-runs
#     overwrite the same documents rather than duplicating.
#   - The install route short-circuits when already installed
#     (see install/index.ts:75-77 in entity_store plugin).
#   - Maintainer-init and trigger-run are idempotent on the server.
#
# Notes:
#   - The xpack.securitySolution.enableExperimental['entityAnalyticsEntityStoreV2']
#     experimental feature flag only gates the *risk-score* maintainer's
#     server-side registration. Automated-resolution does NOT need it, so no
#     Kibana restart is required to run this script.
#   - The automated-resolution maintainer fires every 5 minutes on its own
#     schedule; the explicit run-trigger here just speeds up verification.
#   - "Negative" fixtures (#6 multi-value, #7 stray, #8 no-email, #9 host,
#     #10 host/service) should appear in the latest index but stay *without*
#     entity.relationships.resolution.resolved_to. The final printout makes
#     this easy to eyeball.
#
# Usage:
#   ./.claude/seed-er-fixtures.sh
#
# Overrides:
#   KBN=http://localhost:5601/boa  AUTH=elastic:changeme  ES=http://localhost:9200 \
#     ./.claude/seed-er-fixtures.sh

set -euo pipefail

KBN=${KBN:-http://localhost:5601/boa}
ES=${ES:-http://localhost:9200}
AUTH=${AUTH:-elastic:changeme}

# ----- helpers -----------------------------------------------------------------

kbn() {
  curl -sS -u "$AUTH" \
    -H "kbn-xsrf: 1" \
    -H "Content-Type: application/json" \
    -H "x-elastic-internal-origin: kibana" \
    "$@"
}

es() {
  curl -sS -u "$AUTH" -H "Content-Type: application/json" "$@"
}

sha256() {
  printf '%s' "$1" | shasum -a 256 | awk '{print $1}'
}

now_iso() {
  # Portable RFC3339, UTC, millisecond precision. BSD date (macOS) has no
  # %3N and would silently emit a literal "3N", so we prefer python3 / gdate
  # and fall back to second-precision date as a last resort.
  if command -v python3 >/dev/null 2>&1; then
    python3 -W ignore -c 'from datetime import datetime, timezone; n = datetime.now(timezone.utc); print(n.strftime("%Y-%m-%dT%H:%M:%S.") + f"{n.microsecond//1000:03d}Z")'
  elif command -v gdate >/dev/null 2>&1; then
    gdate -u +%Y-%m-%dT%H:%M:%S.%3NZ
  else
    date -u +%Y-%m-%dT%H:%M:%SZ
  fi
}

# Bulk-NDJSON helpers: emit one create/index action + source line.
#
# emit_user_doc args:
#   1. entityId
#   2. namespace
#   3. ts (RFC3339)
#   4. emailJson — JSON string ('"foo@bar"'), JSON array ('["a","b"]'),
#      or empty string for "no user.email" (matcher-invisible).
#   5. extraUserJson — optional JSON fragment appended to the `user` block,
#      for realistic-but-irrelevant fields like full_name/id.
#      Example: ',"full_name":"Nora Patterson","id":"5191"'
#   6. extraRootJson — optional JSON fragment appended to the doc root,
#      for top-level blocks like `group` / `host`.
#      Example: ',"group":{"name":"admin"},"host":{"name":"host991"}'
#   7. userNameOverride — optional override for `user.name`. Defaults to
#      entityId. Set this when the realistic username (e.g. "nora.patterson1")
#      differs from the synthetic entity_id used to address the doc.
#
# Note: extras MUST start with a leading comma and contain valid JSON.
# Pass empty string ('') for any optional arg to omit.
emit_user_doc() {
  local entityId="$1" namespace="$2" ts="$3" emailJson="$4"
  local extraUserJson="${5:-}" extraRootJson="${6:-}" userNameOverride="${7:-}"
  local userName="${userNameOverride:-$entityId}"
  local id; id=$(sha256 "$entityId")
  printf '{"index":{"_index":"entities-latest-default","_id":"%s"}}\n' "$id"
  if [[ -z "$emailJson" ]]; then
    printf '{"@timestamp":"%s","entity":{"id":"%s","name":"%s","EngineMetadata":{"Type":"user"},"namespace":"%s","lifecycle":{"first_seen":"%s","last_seen":"%s"}},"user":{"name":"%s"%s}%s}\n' \
      "$ts" "$entityId" "$entityId" "$namespace" "$ts" "$ts" "$userName" "$extraUserJson" "$extraRootJson"
  else
    printf '{"@timestamp":"%s","entity":{"id":"%s","name":"%s","EngineMetadata":{"Type":"user"},"namespace":"%s","lifecycle":{"first_seen":"%s","last_seen":"%s"}},"user":{"name":"%s","email":%s%s}%s}\n' \
      "$ts" "$entityId" "$entityId" "$namespace" "$ts" "$ts" "$userName" "$emailJson" "$extraUserJson" "$extraRootJson"
  fi
}

emit_host_doc() {
  local entityId="$1" namespace="$2" ts="$3"
  local id; id=$(sha256 "$entityId")
  printf '{"index":{"_index":"entities-latest-default","_id":"%s"}}\n' "$id"
  printf '{"@timestamp":"%s","entity":{"id":"%s","name":"%s","EngineMetadata":{"Type":"host"},"namespace":"%s","lifecycle":{"first_seen":"%s","last_seen":"%s"}},"host":{"name":"%s"}}\n' \
    "$ts" "$entityId" "$entityId" "$namespace" "$ts" "$ts" "$entityId"
}

emit_service_doc() {
  local entityId="$1" namespace="$2" ts="$3"
  local id; id=$(sha256 "$entityId")
  printf '{"index":{"_index":"entities-latest-default","_id":"%s"}}\n' "$id"
  printf '{"@timestamp":"%s","entity":{"id":"%s","name":"%s","EngineMetadata":{"Type":"service"},"namespace":"%s","lifecycle":{"first_seen":"%s","last_seen":"%s"}},"service":{"name":"%s"}}\n' \
    "$ts" "$entityId" "$entityId" "$namespace" "$ts" "$ts" "$entityId"
}

bulk_index() {
  # Reads NDJSON from stdin, posts to ES _bulk with wait_for refresh.
  local out
  out=$(curl -sS -u "$AUTH" -H "Content-Type: application/x-ndjson" \
           --data-binary @- "$ES/_bulk?refresh=wait_for")
  # Check for "errors":true in response.
  if grep -q '"errors":true' <<<"$out"; then
    echo "  !! Bulk indexing reported errors. Response:"
    echo "$out"
    return 1
  fi
}

trigger_resolution() {
  # POST /entity_maintainers/run/automated-resolution with retry on 500
  # (the route invokes task-manager runSoon and may transiently 500 if a
  # scheduled run is already in flight — see triggerMaintainerRun helper).
  local attempt code body
  for attempt in 1 2 3 4 5; do
    body=$(kbn -w '\n%{http_code}' -o - -X POST \
              -H 'elastic-api-version: 2' \
              -d '{}' \
              "$KBN/internal/security/entity_store/entity_maintainers/run/automated-resolution")
    code=$(printf '%s' "$body" | tail -n1)
    body=$(printf '%s' "$body" | sed '$d')
    if [[ "$code" == "200" ]]; then
      echo "  -> trigger ok (attempt $attempt)"
      return 0
    fi
    if [[ "$code" == "500" ]]; then
      echo "  -> 500 on attempt $attempt, retrying..."
      sleep 2
      continue
    fi
    echo "  !! trigger failed (HTTP $code): $body" >&2
    return 1
  done
  echo "  !! trigger gave up after 5 attempts" >&2
  return 1
}

# ----- 1. Enable the entityStoreV2 UI setting ----------------------------------

echo "[1/7] Enabling securitySolution:entityStoreEnableV2 ..."
kbn -X POST \
  "$KBN/api/kibana/settings/securitySolution:entityStoreEnableV2" \
  -d '{"value":true}' >/dev/null
echo "      ok"

# ----- 2. Install Entity Store -------------------------------------------------

echo "[2/7] Installing Entity Store (public v1 / 2023-10-31) ..."
install_out=$(kbn -X POST \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{}' \
  "$KBN/api/security/entity_store/install")
echo "      $install_out"

# Wait briefly for the install to finish setting up the index + alias before
# we try to bulk-index. Re-poll status until "running".
echo "      waiting for entity store status=running ..."
for _ in $(seq 1 30); do
  status=$(kbn -X GET \
              -H 'elastic-api-version: 2023-10-31' \
              "$KBN/api/security/entity_store/status" || true)
  if grep -q '"status":"running"' <<<"$status"; then
    echo "      ok: running"
    break
  fi
  sleep 1
done

# ----- 3. Init entity maintainers ----------------------------------------------

echo "[3/7] Initialising entity maintainers (internal v2) ..."
kbn -X POST \
  -H 'elastic-api-version: 2' \
  -d '{}' \
  "$KBN/internal/security/entity_store/entity_maintainers/init" >/dev/null \
  && echo "      ok"

# ----- 4. Bulk-seed all fixtures ----------------------------------------------
#
# Wipe any prior `er-*` fixtures first so re-runs are guaranteed to land on a
# fresh state. Without this, prior runs that resolved entities into different
# groups (e.g. fixture #7's ambiguous bucket can collapse into a single group
# if a previous run's order-of-operations differed) would leak through.
# Bulk `index` action overwrites the doc body, but the maintainer state
# (lastProcessedTimestamp) lives in saved-objects and is not reset — so a
# fresh delete here keeps the script truly idempotent.

echo "[4/7] Wiping prior er-* fixtures, then seeding all 18 cases ..."
es -X POST "$ES/entities-latest-default/_delete_by_query?refresh=true" \
   -d '{"query":{"prefix":{"entity.id":"er-"}}}' > /dev/null \
   && echo "      ok: prior er-* fixtures cleared"

TS=$(now_iso)

# Build NDJSON for fixtures 1-4, 6, 7, 8, 9, 10. Fixture 5 is split across two
# bulk requests with a trigger between them (to validate watermark advance).
{
  # #1 Basic match — okta + entra_id, same email
  emit_user_doc "er-1-okta-user"     "okta"     "$TS" '"er-1@example.com"'
  emit_user_doc "er-1-entra-user"    "entra_id" "$TS" '"er-1@example.com"'

  # #2 Namespace priority — AD wins over Okta/Entra
  emit_user_doc "er-2-ad-user"       "active_directory" "$TS" '"er-2@example.com"'
  emit_user_doc "er-2-okta-user"     "okta"             "$TS" '"er-2@example.com"'
  emit_user_doc "er-2-entra-user"    "entra_id"         "$TS" '"er-2@example.com"'

  # #3 Alphabetical fallback — neither namespace in priority list
  emit_user_doc "er-3-a-user"        "slack"  "$TS" '"er-3@example.com"'
  emit_user_doc "er-3-b-user"        "github" "$TS" '"er-3@example.com"'

  # #4 Extend existing — seed target + alias, manual-link below, then seed new
  emit_user_doc "er-4-target"        "okta"     "$TS" '"er-4@example.com"'
  emit_user_doc "er-4-alias"         "entra_id" "$TS" '"er-4@example.com"'

  # #6 Multi-value (negative) — multi gets excluded; single A+B resolve
  emit_user_doc "er-6-multi"         "okta"             "$TS" '["er-6@example.com","er-6-other@example.com"]'
  emit_user_doc "er-6-single-a"      "entra_id"         "$TS" '"er-6@example.com"'
  emit_user_doc "er-6-single-b"      "active_directory" "$TS" '"er-6@example.com"'

  # #7 Ambiguous (negative) — two existing targets + a stray
  emit_user_doc "er-7-t1"            "okta"             "$TS" '"er-7@example.com"'
  emit_user_doc "er-7-e1"            "entra_id"         "$TS" '"er-7@example.com"'
  emit_user_doc "er-7-t2"            "active_directory" "$TS" '"er-7@example.com"'
  emit_user_doc "er-7-e2"            "github"           "$TS" '"er-7@example.com"'
  emit_user_doc "er-7-stray"         "slack"            "$TS" '"er-7@example.com"'

  # #8 No email (negative) — invisible to matcher
  emit_user_doc "er-8-no-email"      "okta" "$TS" ''

  # #9 Mixed entity type (negative) — user + host with parallel names
  emit_user_doc "er-9-user"          "okta"    "$TS" '"er-9@example.com"'
  emit_host_doc "er-9-host"          "unknown" "$TS"

  # #10 Non-user types (negative) — no automated path
  emit_host_doc    "er-10-host"      "unknown" "$TS"
  emit_service_doc "er-10-svc"       "unknown" "$TS"

  # ---------------------------------------------------------------------------
  # EXTENDED FIXTURES (#11–#18) — harder cases inspired by security-ml#417
  # ("Experiment with incomplete logs"), translated to the 9.4 rules-based
  # matcher (only `user.email` + `entity.namespace` matter; all other fields
  # are realistic-but-irrelevant). See .claude/er-v2-9.4-test-data.md §"Extended
  # fixtures (#11–#18)" for the full pass/fail rationale.
  # ---------------------------------------------------------------------------

  # #11 Sparse: email-only — no user.name override (script-default name=entityId
  # is fine, the point is no extra fields). Both have only email; should resolve.
  emit_user_doc "er-11-okta"         "okta"     "$TS" '"er-11@example.com"'
  emit_user_doc "er-11-entra"        "entra_id" "$TS" '"er-11@example.com"'

  # #12 Asymmetric richness — AD has full data, Okta has only email. Same
  # email; AD wins. Tests that field-completeness is irrelevant.
  emit_user_doc "er-12-ad"           "active_directory" "$TS" '"er-12@example.com"' \
    ',"full_name":"Nora Patterson","id":"5191"' \
    ',"group":{"name":"admin"},"host":{"name":"host991"}'
  emit_user_doc "er-12-okta"         "okta"             "$TS" '"er-12@example.com"'

  # #13 Email case-mismatch (gap) — `Alice@Corp.com` vs `alice@corp.com`.
  # term query is case-sensitive on `keyword` → both stay unresolved.
  emit_user_doc "er-13-okta"         "okta"     "$TS" '"Alice@Corp.com"'
  emit_user_doc "er-13-entra"        "entra_id" "$TS" '"alice@corp.com"'

  # #14 Plus-aliased email (gap) — `bob+work@corp.com` vs `bob@corp.com`.
  # Rules engine cannot normalise Gmail/O365 aliases → both unresolved.
  emit_user_doc "er-14-okta"         "okta"     "$TS" '"bob+work@corp.com"'
  emit_user_doc "er-14-entra"        "entra_id" "$TS" '"bob@corp.com"'

  # #15 Shared role email — 3 okta service-accounts + 1 entra_id admin all
  # share noreply@corp.com. Rules engine links ALL into one group; entra_id
  # wins target (no AD; okta beats entra in priority but there are 3 okta —
  # actually with 3 okta + 1 entra, target is the okta with the alphabetically
  # smallest entity.id → er-15-svc-1). Documented false positive.
  emit_user_doc "er-15-svc-1"        "okta"     "$TS" '"noreply@corp.com"' \
    ',"full_name":"Backup Service"'
  emit_user_doc "er-15-svc-2"        "okta"     "$TS" '"noreply@corp.com"' \
    ',"full_name":"CI Pipeline"'
  emit_user_doc "er-15-svc-3"        "okta"     "$TS" '"noreply@corp.com"' \
    ',"full_name":"Monitoring Bot"'
  emit_user_doc "er-15-admin"        "entra_id" "$TS" '"noreply@corp.com"' \
    ',"full_name":"Helpdesk Admin"'

  # #16 Six-way collision — AD + Okta + Entra + Slack + GitHub + M365 share
  # email. AD wins (priority). group_size=6.
  emit_user_doc "er-16-ad"           "active_directory" "$TS" '"er-16@example.com"'
  emit_user_doc "er-16-okta"         "okta"             "$TS" '"er-16@example.com"'
  emit_user_doc "er-16-entra"        "entra_id"         "$TS" '"er-16@example.com"'
  emit_user_doc "er-16-slack"        "slack"            "$TS" '"er-16@example.com"'
  emit_user_doc "er-16-github"       "github"           "$TS" '"er-16@example.com"'
  emit_user_doc "er-16-m365"         "microsoft_365"    "$TS" '"er-16@example.com"'

  # #17 M365 mapped-but-not-priority — M365 + Okta + Entra share email.
  # M365 is namespace-mapped (user.ts:127-134) but absent from
  # NAMESPACE_PRIORITY → Okta wins, NOT M365. group_size=3.
  emit_user_doc "er-17-m365"         "microsoft_365" "$TS" '"er-17@example.com"'
  emit_user_doc "er-17-okta"         "okta"          "$TS" '"er-17@example.com"'
  emit_user_doc "er-17-entra"        "entra_id"      "$TS" '"er-17@example.com"'

  # #18 Name-only, no email (security-ml#417 echo) — same full_name and
  # similar user.name (typical incomplete-log scenario). NO email on either
  # entity → both invisible to the rules engine. Documents the ML PoC gap.
  emit_user_doc "er-18-a"            "active_directory" "$TS" '' \
    ',"full_name":"Nora Patterson","id":"5191"' \
    ',"group":{"name":"admin"},"host":{"name":"host991"}'
  emit_user_doc "er-18-b"            "okta"             "$TS" '' \
    ',"full_name":"Nora Patterson","id":"5192"' \
    ',"group":{"name":"admin"},"host":{"name":"host992"}'

  # ---------------------------------------------------------------------------
  # NAME-BASED FIXTURES (#19–#27) — realistic human-name scenarios for the
  # embedding-resolution maintainer. None of these share a usable user.email
  # under the rule-based matcher's keyword-equality semantics, so the rules
  # engine is silent on every fixture below; observed linking is exclusively
  # the embedding maintainer's signal. See .claude/er-v2-name-fixture-cases.md
  # for the per-case design rationale and expected outcomes.
  # ---------------------------------------------------------------------------

  # #19 security-ml#417 echo, expanded — one canonical Nora Paterson with
  # full_name + email, and four username-variant entities with no email and
  # no full_name. Tests whether embedding can pull the variants into the
  # canonical group via name semantic similarity alone.
  emit_user_doc "er-19-okta"         "okta"             "$TS" '"nora.paterson@company.com"' \
    ',"full_name":"Nora Paterson"' \
    '' \
    "nora.paterson"
  emit_user_doc "er-19-entra"        "entra_id"         "$TS" '' \
    '' '' "nora.patterson1"
  emit_user_doc "er-19-ad"           "active_directory" "$TS" '' \
    '' '' "npatterson"
  emit_user_doc "er-19-slack"        "slack"            "$TS" '' \
    '' '' "norapatterson"
  emit_user_doc "er-19-github"       "github"           "$TS" '' \
    '' '' "n.patterson"

  # #20 Typo / spelling drift — Nora Patterson (double-t) vs Nora Paterson
  # (single-t), each with its own consistently-spelled email. Rules cannot
  # link (different keyword values); embedding should tolerate the typo.
  emit_user_doc "er-20-okta"         "okta"             "$TS" '"nora.patterson@corp.com"' \
    ',"full_name":"Nora Patterson"' \
    '' \
    "nora.patterson"
  emit_user_doc "er-20-entra"        "entra_id"         "$TS" '"nora.paterson@corp.com"' \
    ',"full_name":"Nora Paterson"' \
    '' \
    "nora.paterson"

  # #21 Surname distractor (precision test, security-ml#417 failure mode) —
  # one Nora Patterson and two Levi Peterson accounts on the same
  # @company.com domain. The two Levi accounts represent the same human under
  # different account names and should embedding-link. Patterson should NOT
  # link to either Peterson, even though they share a domain and a similar
  # surname tail. This is exactly the false-positive the issue's kNN run hit.
  emit_user_doc "er-21-nora"         "active_directory" "$TS" '"nora.patterson@company.com"' \
    ',"full_name":"Nora Patterson"' \
    '' \
    "nora.patterson"
  emit_user_doc "er-21-levi-1"       "okta"             "$TS" '"levi.peterson@company.com"' \
    ',"full_name":"Levi Peterson"' \
    '' \
    "levi.peterson"
  emit_user_doc "er-21-levi-2"       "entra_id"         "$TS" '"l.peterson@company.com"' \
    ',"full_name":"L. Peterson"' \
    '' \
    "l.peterson"

  # #22 Display-only vs username-only (cross-field semantic match) —
  # er-22-display has full_name="Marcus Liu" but no overridden user.name (so
  # the embedded `name` field is the synthetic "er-22-display"); er-22-user
  # has user.name="marcus.liu" and no full_name. Each side is missing the
  # field the other has, so the only way to link is to recognise that
  # "Marcus Liu" and "marcus.liu" describe the same identity across fields.
  emit_user_doc "er-22-display"      "okta"             "$TS" '' \
    ',"full_name":"Marcus Liu"'
  emit_user_doc "er-22-user"         "entra_id"         "$TS" '' \
    '' '' "marcus.liu"

  # #23 Initial-vs-full first name — N. Reyes vs Nora Reyes, both with
  # consistent username forms and no email. Tests whether the model expands
  # a single-letter initial against the matching first name.
  emit_user_doc "er-23-initial"      "okta"             "$TS" '' \
    ',"full_name":"N. Reyes"' \
    '' \
    "n.reyes"
  emit_user_doc "er-23-full"         "entra_id"         "$TS" '' \
    ',"full_name":"Nora Reyes"' \
    '' \
    "nora.reyes"

  # #24 Common-name homonyms (negative / over-link risk) — three entirely
  # different humans, all named "John Smith", on three different mail
  # domains. Rules cannot link them (different emails). Embedding will
  # almost certainly cluster them all together because the only
  # discriminating token is the email domain — documents the precision
  # ceiling for high-frequency real names.
  emit_user_doc "er-24-corp"         "okta"             "$TS" '"john.smith@corp.com"' \
    ',"full_name":"John Smith"' \
    '' \
    "john.smith"
  emit_user_doc "er-24-acme"         "entra_id"         "$TS" '"john.smith@acme.io"' \
    ',"full_name":"John Smith"' \
    '' \
    "john.smith"
  emit_user_doc "er-24-family"       "active_directory" "$TS" '"john.smith@smithfamily.org"' \
    ',"full_name":"John Smith"' \
    '' \
    "john.smith"

  # #25 Accent / locale variant — José García (with diacritics) vs Jose
  # Garcia (ASCII fold). Same human, no shared email; tests whether the
  # embedding model is robust to Unicode normalisation differences.
  emit_user_doc "er-25-accent"       "okta"             "$TS" '' \
    ',"full_name":"José García"' \
    '' \
    "jose.garcia"
  emit_user_doc "er-25-ascii"        "entra_id"         "$TS" '' \
    ',"full_name":"Jose Garcia"' \
    '' \
    "jose.garcia"

  # #26 Name-order convention — Wei Chen (Western order: given-family) vs
  # Chen Wei (Eastern order: family-given). Same tokens, reversed. Tests
  # whether the embedding is order-tolerant enough to recognise this as one
  # person rather than two.
  emit_user_doc "er-26-western"      "okta"             "$TS" '' \
    ',"full_name":"Wei Chen"' \
    '' \
    "wei.chen"
  emit_user_doc "er-26-eastern"      "entra_id"         "$TS" '' \
    ',"full_name":"Chen Wei"' \
    '' \
    "chen.wei"

  # #27 Hyphenated / married name — Nora Patterson (maiden) vs Nora
  # Patterson-Smith (married). Same human after a life event; the second
  # form is a strict superset of the first. No shared email.
  emit_user_doc "er-27-maiden"       "okta"             "$TS" '' \
    ',"full_name":"Nora Patterson"' \
    '' \
    "nora.patterson"
  emit_user_doc "er-27-married"      "entra_id"         "$TS" '' \
    ',"full_name":"Nora Patterson-Smith"' \
    '' \
    "nora.patterson-smith"
} | bulk_index
echo "      ok: bulk-seeded all rule + name fixtures (fixture #5 batch handled below)"

# ----- 5. Manual links for #4 and #7 -------------------------------------------

echo "[5/7] Posting manual links (fixtures #4 and #7 require pre-existing groups) ..."

# #4: link er-4-alias -> er-4-target
kbn -X POST \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{"target_id":"er-4-target","entity_ids":["er-4-alias"]}' \
  "$KBN/api/security/entity_store/resolution/link" >/dev/null \
  && echo "      ok: er-4-alias -> er-4-target"

# #7: two separate groups, making the er-7@ bucket ambiguous
kbn -X POST \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{"target_id":"er-7-t1","entity_ids":["er-7-e1"]}' \
  "$KBN/api/security/entity_store/resolution/link" >/dev/null \
  && echo "      ok: er-7-e1 -> er-7-t1"

kbn -X POST \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{"target_id":"er-7-t2","entity_ids":["er-7-e2"]}' \
  "$KBN/api/security/entity_store/resolution/link" >/dev/null \
  && echo "      ok: er-7-e2 -> er-7-t2"

# Now seed er-4-new (so it joins the pre-existing #4 group on next run)
# alongside fixture #5 batch A. Batch B will be seeded after the run.
echo "      seeding er-4-new + fixture #5 batch A ..."
TS=$(now_iso)
{
  emit_user_doc "er-4-new"           "entra_id" "$TS" '"er-4@example.com"'
  # #5 batch A
  emit_user_doc "er-5-a1"            "okta"     "$TS" '"er-5-a@example.com"'
  emit_user_doc "er-5-a2"            "entra_id" "$TS" '"er-5-a@example.com"'
} | bulk_index
echo "      ok"

# ----- 6. Trigger automated-resolution (round 1) -------------------------------

echo "[6/7] Triggering automated-resolution maintainer (round 1) ..."
trigger_resolution
# Maintainer runSoon is async; give it a moment to settle.
sleep 6

# Fixture #5 part B: seed a second batch with a later timestamp, then trigger
# again. The watermark advanced from round 1 means only B will be processed.
echo "      seeding fixture #5 batch B (with later timestamp) ..."
sleep 1  # ensure first_seen is strictly later
TS=$(now_iso)
{
  emit_user_doc "er-5-b1"            "okta"     "$TS" '"er-5-b@example.com"'
  emit_user_doc "er-5-b2"            "entra_id" "$TS" '"er-5-b@example.com"'
} | bulk_index

echo "      Triggering automated-resolution maintainer (round 2) ..."
trigger_resolution
sleep 6

# ----- 7. Verification ---------------------------------------------------------

echo "[7/7] Verification: resolution groups for the PASS fixtures."

print_group() {
  local entityId="$1" label="$2"
  echo
  echo "----- $label (entity_id=$entityId) -----"
  kbn -X GET \
    -H 'elastic-api-version: 2023-10-31' \
    "$KBN/api/security/entity_store/resolution/group?entity_id=$entityId&apiVersion=2" \
    | python3 -m json.tool 2>/dev/null \
    || kbn -X GET \
         -H 'elastic-api-version: 2023-10-31' \
         "$KBN/api/security/entity_store/resolution/group?entity_id=$entityId&apiVersion=2"
}

print_group "er-1-okta-user" "#1 Basic match (expect group_size=2, target=er-1-okta-user)"
print_group "er-2-ad-user"   "#2 NS priority (expect group_size=3, target=er-2-ad-user)"
print_group "er-3-a-user"    "#3 Alphabetical (expect group_size=2, target=er-3-a-user)"
print_group "er-4-target"    "#4 Extend existing (expect group_size=3, target=er-4-target)"
print_group "er-5-a1"        "#5 Incremental A (expect group_size=2, target=er-5-a1)"
print_group "er-5-b1"        "#5 Incremental B (expect group_size=2, target=er-5-b1)"
print_group "er-6-single-b"  "#6 Multi-value: single pair only (expect group_size=2, target=er-6-single-b; er-6-multi NOT in group)"

# Extended fixtures (#11–#17): pass cases.
print_group "er-11-okta"     "#11 Sparse email-only (expect group_size=2, target=er-11-okta)"
print_group "er-12-ad"       "#12 Asymmetric richness (expect group_size=2, target=er-12-ad)"
print_group "er-15-svc-1"    "#15 Shared role email (expect group_size=4, target=er-15-svc-1; documented false positive across 3 okta service-accounts + 1 entra_id admin)"
print_group "er-16-ad"       "#16 Six-way collision (expect group_size=6, target=er-16-ad)"
print_group "er-17-okta"     "#17 M365 not-priority (expect group_size=3, target=er-17-okta; M365 is mapped but NOT in NAMESPACE_PRIORITY)"

echo
echo "----- Negative fixtures under rule-based ER (expect NO resolved_to) -----"
echo "  Original: er-6-multi (multi-value email), er-7-stray (ambiguous bucket),"
echo "            er-8-no-email, er-9-host (mixed type), er-10-host, er-10-svc"
echo "  Extended (#13/#14/#18): email-format quirks + name-only (#417 echo)"
echo "  Name-based (#19–#27): see .claude/er-v2-name-fixture-cases.md."
echo "  Rules cannot link any of these; expect them to appear here with"
echo "  resolved_to=null. The embedding-resolution maintainer (separate"
echo "  experimental flag, ~5-min cadence) is the one expected to link a"
echo "  subset of them later — re-run the resolution group lookup or check"
echo "  the entity flyout in the UI to confirm embedding outcomes."
es -X POST "$ES/entities-latest-default/_search?pretty&filter_path=hits.hits._source.entity.id,hits.hits._source.entity.relationships.resolution.resolved_to,hits.hits._source.entity.relationships.resolution.resolved_by,hits.hits._source.entity.EngineMetadata.Type,hits.hits._source.user.name,hits.hits._source.user.email,hits.hits._source.user.full_name" \
  -d '{
    "size": 60,
    "_source": [
      "entity.id",
      "entity.relationships.resolution.resolved_to",
      "entity.relationships.resolution.resolved_by",
      "entity.EngineMetadata.Type",
      "user.name","user.email","user.full_name"
    ],
    "query": { "terms": { "entity.id": [
      "er-6-multi","er-7-stray","er-8-no-email","er-9-host","er-10-host","er-10-svc",
      "er-13-okta","er-13-entra","er-14-okta","er-14-entra","er-18-a","er-18-b",
      "er-19-okta","er-19-entra","er-19-ad","er-19-slack","er-19-github",
      "er-20-okta","er-20-entra",
      "er-21-nora","er-21-levi-1","er-21-levi-2",
      "er-22-display","er-22-user",
      "er-23-initial","er-23-full",
      "er-24-corp","er-24-acme","er-24-family",
      "er-25-accent","er-25-ascii",
      "er-26-western","er-26-eastern",
      "er-27-maiden","er-27-married"
    ] } }
  }'

echo
echo "Done. Re-run this script any time to refresh the dataset."

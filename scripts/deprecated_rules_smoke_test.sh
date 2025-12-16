#!/bin/bash
# Smoke test for deprecated prebuilt rule assets
# Verifies that deprecated rule SOs are stored correctly and filtered out of existing queries

set -euo pipefail

KIBANA_URL="${KIBANA_URL:-http://localhost:5601/kbn}"
AUTH="${KIBANA_AUTH:-elastic:changeme}"
SO_API="${KIBANA_URL}/api/saved_objects"
FIND_API="${KIBANA_URL}/api/saved_objects/_find"

PASS=0
FAIL=0

pass() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }

echo "=== Deprecated Rules Smoke Test ==="
echo "Target: ${KIBANA_URL}"
echo ""

# --- Cleanup any leftover SOs from previous runs ---
echo "🧹 Pre-cleanup..."
curl -s -o /dev/null -X DELETE "${SO_API}/security-rule/smoke-deprecated-1_1" -H 'kbn-xsrf: true' -u "${AUTH}" || true
curl -s -o /dev/null -X DELETE "${SO_API}/security-rule/smoke-deprecated-2_1" -H 'kbn-xsrf: true' -u "${AUTH}" || true
curl -s -o /dev/null -X DELETE "${SO_API}/security-rule/smoke-active-1_1" -H 'kbn-xsrf: true' -u "${AUTH}" || true
echo ""

# --- Setup: Create test SOs ---
echo "📦 Creating test saved objects..."

# Deprecated rule (minimal)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${SO_API}/security-rule/smoke-deprecated-1_1" \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -u "${AUTH}" \
  -d '{
    "attributes": {
      "rule_id": "smoke-deprecated-1",
      "version": 1,
      "name": "Smoke Test Deprecated Rule (no reason)",
      "deprecated": true
    }
  }')
[ "$STATUS" = "200" ] && pass "Created deprecated rule SO (no reason)" || fail "Create deprecated rule SO (no reason): HTTP ${STATUS}"

# Deprecated rule (with reason)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${SO_API}/security-rule/smoke-deprecated-2_1" \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -u "${AUTH}" \
  -d '{
    "attributes": {
      "rule_id": "smoke-deprecated-2",
      "version": 1,
      "name": "Smoke Test Deprecated Rule (with reason)",
      "deprecated": true,
      "deprecated_reason": "Replaced by smoke-active-1"
    }
  }')
[ "$STATUS" = "200" ] && pass "Created deprecated rule SO (with reason)" || fail "Create deprecated rule SO (with reason): HTTP ${STATUS}"

# Active rule (for comparison)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${SO_API}/security-rule/smoke-active-1_1" \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -u "${AUTH}" \
  -d '{
    "attributes": {
      "rule_id": "smoke-active-1",
      "version": 1,
      "name": "Smoke Test Active Rule",
      "description": "An active rule for comparison",
      "risk_score": 50,
      "severity": "medium",
      "type": "query",
      "query": "process.name: test",
      "language": "kuery"
    }
  }')
[ "$STATUS" = "200" ] && pass "Created active rule SO" || fail "Create active rule SO: HTTP ${STATUS}"

echo ""

# --- Test 1: Deprecated SOs exist and have correct attributes ---
echo "🔍 Test 1: Verify deprecated SO attributes..."

DEPRECATED_1=$(curl -s -u "${AUTH}" "${SO_API}/security-rule/smoke-deprecated-1_1")
HAS_DEPRECATED=$(echo "$DEPRECATED_1" | grep -c '"deprecated":true' || true)
[ "$HAS_DEPRECATED" -ge 1 ] && pass "Deprecated rule has deprecated=true" || fail "Deprecated rule missing deprecated=true"

DEPRECATED_2=$(curl -s -u "${AUTH}" "${SO_API}/security-rule/smoke-deprecated-2_1")
HAS_REASON=$(echo "$DEPRECATED_2" | grep -c '"deprecated_reason":"Replaced by smoke-active-1"' || true)
[ "$HAS_REASON" -ge 1 ] && pass "Deprecated rule has deprecated_reason" || fail "Deprecated rule missing deprecated_reason"

echo ""

# --- Test 2: Find by specific IDs (unfiltered) returns all ---
echo "🔍 Test 2: Unfiltered find returns all test rules..."

# Use KQL filter on rule_id to scope to our test rules
ALL_RULES=$(curl -s -u "${AUTH}" \
  --data-urlencode "type=security-rule" \
  --data-urlencode "per_page=100" \
  --data-urlencode "filter=security-rule.attributes.rule_id: smoke-deprecated-1 OR security-rule.attributes.rule_id: smoke-deprecated-2 OR security-rule.attributes.rule_id: smoke-active-1" \
  -G "${FIND_API}")
ALL_COUNT=$(echo "$ALL_RULES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total', 0))" 2>/dev/null || echo "0")
[ "$ALL_COUNT" -eq 3 ] && pass "Unfiltered find returns 3 results (got ${ALL_COUNT})" || fail "Unfiltered find expected 3, got ${ALL_COUNT}"

echo ""

# --- Test 3: KQL filter excludes deprecated rules ---
echo "🔍 Test 3: KQL filter excludes deprecated rules..."

FILTERED=$(curl -s -u "${AUTH}" \
  --data-urlencode "type=security-rule" \
  --data-urlencode "per_page=100" \
  --data-urlencode "filter=(security-rule.attributes.rule_id: smoke-deprecated-1 OR security-rule.attributes.rule_id: smoke-deprecated-2 OR security-rule.attributes.rule_id: smoke-active-1) AND NOT security-rule.attributes.deprecated:true" \
  -G "${FIND_API}")
FILTERED_COUNT=$(echo "$FILTERED" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total', 0))" 2>/dev/null || echo "0")
[ "$FILTERED_COUNT" -eq 1 ] && pass "KQL filter returns only active rule (got ${FILTERED_COUNT})" || fail "KQL filter expected 1, got ${FILTERED_COUNT}"

HAS_DEPRECATED_IN_FILTERED=$(echo "$FILTERED" | grep -c '"deprecated":true' || true)
[ "$HAS_DEPRECATED_IN_FILTERED" -eq 0 ] && pass "No deprecated rules in filtered results" || fail "Deprecated rules leaked into filtered results"

# Verify the one result is our active rule
HAS_ACTIVE=$(echo "$FILTERED" | grep -c 'smoke-active-1' || true)
[ "$HAS_ACTIVE" -ge 1 ] && pass "Active rule present in filtered results" || fail "Active rule missing from filtered results"

echo ""

# --- Test 4: Filter for ONLY deprecated rules ---
echo "🔍 Test 4: Filter for only deprecated rules..."

DEPRECATED_ONLY=$(curl -s -u "${AUTH}" \
  --data-urlencode "type=security-rule" \
  --data-urlencode "per_page=100" \
  --data-urlencode "filter=security-rule.attributes.deprecated:true AND (security-rule.attributes.rule_id: smoke-deprecated-1 OR security-rule.attributes.rule_id: smoke-deprecated-2 OR security-rule.attributes.rule_id: smoke-active-1)" \
  -G "${FIND_API}")
DEP_COUNT=$(echo "$DEPRECATED_ONLY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total', 0))" 2>/dev/null || echo "0")
[ "$DEP_COUNT" -eq 2 ] && pass "Deprecated-only filter returns 2 results (got ${DEP_COUNT})" || fail "Deprecated-only filter expected 2, got ${DEP_COUNT}"

echo ""

# --- Cleanup ---
echo "🧹 Cleaning up test SOs..."
curl -s -o /dev/null -X DELETE "${SO_API}/security-rule/smoke-deprecated-1_1" -H 'kbn-xsrf: true' -u "${AUTH}"
curl -s -o /dev/null -X DELETE "${SO_API}/security-rule/smoke-deprecated-2_1" -H 'kbn-xsrf: true' -u "${AUTH}"
curl -s -o /dev/null -X DELETE "${SO_API}/security-rule/smoke-active-1_1" -H 'kbn-xsrf: true' -u "${AUTH}"
echo "  Done."

echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1

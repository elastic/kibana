# Indicator Match CPS verifications

Cluster: origin `keepcps-2907-origin-c2eb74`, linked `-01-e997a2`, `-03-fdbf47`. Space `default`, ES 9.6.0.
Rules named `CPS IM <case>` and their `cps-im-*` indices are left in place. Each rule was disabled
after its alerts were captured (re-enable in the UI to continue). Space routing restored to `_alias:*`.

Method note: each rule was created enabled via the API and polled for up to ~200s (a few scheduled
executions). Alert provenance fields read from the alert document. `labels.cps_seeded_project` is
carried from the source event, so it identifies which project an alerting event came from.

---

## Confirmed (matches expectation)

- `s2-origin-still-alerts` (scenario 2, routing `_alias:_origin`)
  Origin event + indicator, origin-only scope.
  Alerts created: 1
  `kibana.cps_scope.expression`: `_alias:_origin` ✅
  `kibana.cps_scope.linked_projects`: NOT PRESENT
  `labels.cps_seeded_project`: `keepcps-2907-origin-c2eb74` ✅
  Origin data still alerts while scope is origin-only.

- `s2-leakbait-linked` (scenario 2, routing `_alias:_origin`)
  Matching leak-bait only on linked-01, origin-only scope.
  Alerts created: 0 ✅
  No alert: the origin-scoped rule cannot see leak-bait on the linked project. This is the
  core "no leak / only in scope" result.

- `s1-scopegate-origin` (scenario 1, routing `_alias:_origin`, negative control)
  Identical match on origin AND linked-01, origin-only scope.
  Alerts created: 1
  `kibana.cps_scope.expression`: `_alias:_origin` ✅
  `kibana.cps_scope.linked_projects`: NOT PRESENT
  `labels.cps_seeded_project`: `keepcps-2907-origin-c2eb74` ✅
  ONLY origin alerts. The identical data on linked-01 is out of scope and produces nothing.
  Direct proof that alerts come only from in-scope data.

- `s3-narrowing` (scenario 1/3, routing `_alias:*`)
  Two matching hosts (keep on origin, drop on linked-01), event query keeps `cps-s3-keep`.
  Alerts created: 1
  `kibana.cps_scope.expression`: `_alias:*` ✅
  `kibana.cps_scope.linked_projects`: NOT PRESENT
  `labels.cps_seeded_project`: `keepcps-2907-origin-c2eb74` ✅
  The event query narrowed to the kept host, which alerted. Note: this run does not prove the
  linked host would have alerted absent the filter (see the open items below), only that the
  narrowing control removed it.

---

## Open (observed no alert; NOT confirmed as a product limitation)

All four below use routing `_alias:*` (all linked in scope) and involve LINKED data. None alerted
inside the ~200s poll window. Your own `s1-linked-only` (event + indicator both on linked-01) DID
alert, so linked alerting is not universally broken. These need confirmation over a longer window
in the UI before being called a limitation.

- `s1-split-events-origin-ind-linked` (routing `_alias:*`)
  Event on origin, indicator on linked-01 (indicators-only-on-linked).
  Alerts created: 0 (expected an alert)
  Candidate finding: the event/indicator join may not span projects.

- `s1-split-events-linked-ind-origin` (routing `_alias:*`)
  Event on linked-01, indicator on origin (events-only-on-linked).
  Alerts created: 0 (expected an alert)
  Candidate finding: same cross-project join, other direction.

- `s1-scopegate-all` (routing `_alias:*`)
  Identical match on origin AND linked-01, all-linked scope.
  Alerts created: 1
  `kibana.cps_scope.expression`: `_alias:*` ✅
  `kibana.cps_scope.linked_projects`: NOT PRESENT
  `labels.cps_seeded_project`: `keepcps-2907-origin-c2eb74` only (linked-01 side did not alert
  within 200s; expected origin AND linked-01)
  The origin side alerted; the co-located linked-01 side did not appear. Most consistent with
  CPS fan-out latency or partial results, since the same co-located shape alerted in
  `s1-linked-only`.

- `s4-linked-unavailable` (routing `_alias:*`, available state)
  Event + indicator both on linked-03.
  Alerts created: 0 (expected an alert in the available state)
  Co-located on linked-03. Did not alert within 200s. The "make it unavailable" step is manual
  and was not performed. Worth checking whether linked-03 fans out at all (vs linked-01, which
  did in `s1-linked-only`).

---

## Provenance and method caveats

- `kibana.cps_scope.expression` is populated and always matched the scope in force
  (`_alias:*` or `_alias:_origin`) on every alert produced. Provenance-by-expression is reliable.
- `kibana.cps_scope.linked_projects` is NOT PRESENT on any alert in this build, including
  linked-only matches. Do not rely on it; use the expression field.
- A plain project API key querying Elasticsearch directly is ORIGIN-SCOPED. With
  `project_routing:_alias:*` in the body it still cannot see a linked-only index
  (`index_not_found_exception`), and `GET /_project/tags` returns only the origin (no
  `linked_projects`). Cross-project reads only happen through the Kibana CPS path (detection
  rules, data views, Discover). Verify linked behavior in the UI, not with a raw ES key.

## Suggested next step to close the open items

The four open rules and their data are in place (disabled). With space routing at `_alias:*`,
re-enable them in the UI and watch over several executions (5 to 10 minutes). If the linked and
split matches eventually alert, the cause is CPS fan-out timing or partial results; if they never
do, the cross-project join is a real Indicator Match limitation worth filing. An automated re-run
with a much longer poll can do the same unattended.

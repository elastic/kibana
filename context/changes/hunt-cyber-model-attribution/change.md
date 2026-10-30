# hunt-cyber-model-attribution

status: implementing
updated: 2026-10-30

## Summary

Follow-up to kibana#300025 (Route Hunt Watch through Cyber domain models). The cyber-domain
model resolved from the `alertzero_template_models` row carries no `telemetryMetadata`, so
every extraction, dataset-match and recommendations call that runs on it writes a token-usage
doc with no `feature_id` / `parent_feature_id`. The template path
(`inferenceClient.chatComplete({ template })`) is unattributed for the same reason: the bound
client is created with `connectorId` only. One small PR, cut from main after 300025 merges,
passes the tier `telemetryMetadata` to the cyber resolver and binds
`metadata.connectorTelemetry` on the inference client in `buildScopedModel`.

Origin: review finding F on 300025 (never posted) and Libra P2 thread r4407536958, which
Steph chose to leave unanswered on 300025 and fix here instead.

## Tracker

- Epic: kibana-0vt
- Children: kibana-0vt.1 (attribute both paths + tests), kibana-0vt.2 (gates and PR)
- Related: kibana#300025 (base, must merge first), kibana#297563 (added tier attribution,
  the pattern this copies), review ledger `.tmp-pr-reviews/pr-300025-review.md`

## Decisions (2026-10-29)

- Wait for 300025 to merge, then branch from main. No branch off Yuliia's fork.
- Template path gets attribution by binding metadata on the client, not per call.
- Link Libra's thread in the PR body only. No reply on 300025.
- Unit tests only. No live token-usage check.

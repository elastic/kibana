# hunt-worker-endpoint-metadata-read

status: implementing
updated: 2026-10-21

## Summary

The Hunt worker runs as the `kibana/alertzero_threat_hunt` service account. Its built-in
role has no `read` on `metrics-endpoint.metadata_current_*`, so `readEndpointCapabilities`
in `alertzero/server/services/fleet/resolve_host_enrollment.ts` (which deliberately uses the
step's scoped client) sees no document and yields `[]`. Packaging then treats every enrolled
host as "suspend only": memory dump and isolate are held back with copy that blames the
endpoint ("the endpoint does not report memdump_process / isolation") even when the endpoint
reports both. Fix: grant `read` on `metrics-endpoint.metadata_current_*` to the role in all
three places it is defined (Elasticsearch reserved role, elasticsearch-controller predefined
role, both Kibana `roles.yml` mirrors), in the merge order the Attack Discovery grant used
last week, and make packaging carry a `capabilitiesSource` marker so the Held back and Why
copy says when capabilities could not be read rather than blaming the endpoint. Decisions
D1 to D6 are recorded in `plan.md`.

## Tracker

- Epic: kibana-6gi
- Children: kibana-6gi.1 (Elasticsearch reserved role grant, main + 9.6 backport),
  kibana-6gi.2 (elasticsearch-controller predefined role grant),
  kibana-6gi.3 (Kibana PR: mirrors + unreadable-capabilities marker and copy),
  kibana-6gi.4 (close-out on security-team#20382 and #19909)
- Upstream private issue: https://github.com/elastic/security-team/issues/20382 (private
  repo; link it from the private controller PR and cross-link the public ES and Kibana PRs on
  security-team#20382, never in the public ES or Kibana PR descriptions or commit messages)

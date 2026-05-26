# Detection Engine & Alerting Convergence — Diagrams

Architecture diagrams from the architecture / Alerting v2 / Streams / Attack Discovery discussion.

## Excalidraw file

Open in [Excalidraw](https://excalidraw.com) or VS Code with an Excalidraw extension:

- [`detection_engine_convergence_diagrams.excalidraw`](./detection_engine_convergence_diagrams.excalidraw) — combined canvas (overview + notes for other views)

## Inline diagrams (Cursor chat)

These were rendered interactively in the conversation. To continue editing in chat, reference checkpoint IDs:

| Diagram | Checkpoint ID |
|---------|-----------------|
| Security vs Observability overview | `85b4cc2f135541b198` |
| Alerting v2 execution pipeline | `c02e57da16ba463c8a` |
| Suggested convergence phasing | `c92a44b7fa3c430395` |
| DE v1 execution pipeline | `412ce4dce3f84a8698` |
| DE v2 consumer impact matrix | `c801787117e34f2a86` |

## Diagram index

1. **Architecture overview** — Security (DE v1, RAC, Attack Discovery) vs Observability (Streams, KI, sig events, Alerting v2)
2. **Alerting v2 pipeline** — Task Manager → executor → `.rule-events` → Director → Dispatcher
3. **DE v1 pipeline** — Security wrapper → persistence → search_after → RAC
4. **Convergence phasing** — Phase 1 / 2 / 3 and parallel Attack Discovery track
5. **Consumer impact** — Who breaks if alerts move off `.alerts-security.alerts`

## Related docs

- [PR #266528](https://github.com/elastic/kibana/pull/266528) — Security DE on Alerting v2 POC
- `x-pack/platform/plugins/shared/alerting_v2/server/README.md` — Alerting v2 platform architecture
- `x-pack/platform/plugins/shared/streams/server/lib/streams/assets/query/v2_rules_adapter.ts` — Streams ↔ Alerting v2

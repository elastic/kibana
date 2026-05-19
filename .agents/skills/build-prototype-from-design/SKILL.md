---
name: build-prototype-from-design
description: Builds a working Kibana prototype from a design screenshot or description. Use when asked to 'build this design', 'prototype this', 'implement this UI', 'add this panel', 'replace this component', or 'run/start Kibana' for prototyping in Kibana. Produces real EUI-based code in the examples/ directory. Never intended to be merged — optimised for speed and visual fidelity over production readiness.
---

# Build prototype from design

Turn a design (Figma, screenshot, or brief) into working Kibana UI. **Not for merge.**

## Workflow

| Step | Reference | When to skip |
|------|-----------|--------------|
| 1. Process design and plan | [process-and-plan](references/process-and-plan.md) | Never for new work |
| 2. Implement | [implement](references/implement.md) | — |
| 3. Run Kibana | [run-kibana](references/run-kibana.md) | Stack already up |
| 4. Ingest data | [ingest-data](references/ingest-data.md) | Mocks only / empty OK |
| 5. Build version panel | [build-version-panel](references/build-version-panel.md) | Single design only |

Run **1 → 5** for a full prototype. For a single step (e.g. only run Kibana), open that reference only.

## Principles

- New prototypes → **`examples/`** + `yarn start --run-examples` (see [run-kibana](references/run-kibana.md)).
- **Plan before code** (step 1): route each element via [eui-vs-kbnui](references/eui-vs-kbnui.md) (default raw EUI).
- **Ask** in step 1 and step 4 when choices are unclear (host path, data type).

Repo root: `kibana/`. New example plugins: `yarn kbn bootstrap` after scaffold ([implement](references/implement.md)).
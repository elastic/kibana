<!--
Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
or more contributor license agreements. Licensed under the "Elastic License
2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
Public License v 1"; you may not use this file except in compliance with, at
your election, the "Elastic License 2.0", the "GNU Affero General Public
License v3.0 only", or the "Server Side Public License, v 1".
-->

# RFC: Phase 2 Workflow Execution Limits

**Status:** Draft  
**Authors:** Workflows Engine Team  
**Date:** 2026-03-16  
**Parent Epic:** [elastic/security-team#15842](https://github.com/elastic/security-team/issues/15842)

---

## Overview

This RFC documents Phase 2 of the Workflow Execution Limits work. **Phase 1** (already merged in [PR #254918](https://github.com/elastic/kibana/pull/254918)) covered per-step I/O size enforcement via `max-step-size`:

- **Layer 1:** Pre-emptive I/O interception for HTTP/ES/Kibana steps
- **Layer 2:** Post-hoc output guard in `BaseAtomicNodeImplementation`

Phase 2 adds five new execution limit mechanisms.

---

## Problem Statement

Phase 1 protects individual step output sizes but does not cover:

1. **LiquidJS OOM**: A for-loop like `{% for i in (1..500000) %}AAAA{% endfor %}` crashes Kibana with 1GB memory. The built-in `memoryLimit` doesn't count emitter buffer growth.
2. **Unbounded loop iterations**: foreach/while without `max-iterations` can run indefinitely.
3. **Cumulative context growth**: Many small steps can accumulate to exceed available memory.
4. **Too many steps**: Extremely large workflow definitions degrade performance.
5. **Large workflow output**: Child workflow output via `workflow.execute` can be unbounded.

---

## Solution

### 1. LiquidJS Output Size Cap (P0 - OOM Prevention)

- **What**: Custom `SizeLimitedEmitter` class checks byte size on every `write()` during LiquidJS rendering
- **Where**: `create_workflow_liquid_engine.ts` (emitter class), `templating_engine.ts` (rendering path), `workflow_context_manager.ts` (wiring)
- **Limit**: Uses the step's `max-step-size` (resolved via step > workflow > plugin config > 10MB default)
- **Error**: `TemplateSizeLimitExceeded`
- **How**: Uses lower-level LiquidJS APIs (`engine.parse()` + `renderer.renderTemplates()` with custom emitter) instead of `parseAndRenderSync` when a limit is set

### 2. Default Loop Iteration Cap

- **What**: foreach/while loops without `max-iterations` now default to 2000 with `on-limit: continue`
- **Where**: `normalizeMaxIterations()` in `build_execution_graph.ts`
- **Limit**: `DEFAULT_MAX_LOOP_ITERATIONS = 2000`
- **Behavior**: Silently stops after 2000 iterations (existing Omri's `max-iterations` mechanism)

### 3. Cumulative Output Budget

- **What**: Tracks total output bytes across all completed steps
- **Where**: `WorkflowExecutionState.cumulativeOutputBytes`, checked in `StepExecutionRuntime.finishStep()`
- **Limit**: `max-total-output-size` in YAML settings, or `maxCumulativeOutputSize` plugin config (default 150MB)
- **Error**: `WorkflowOutputBudgetExceeded`

### 4. Step Count Validation

- **What**: Validates total step count at definition time
- **Where**: `validateStepCount()` in management plugin, called from `validateWorkflowYaml()`
- **Limit**: `max-steps` in YAML settings (default 150)
- **Error**: Validation diagnostic (prevents saving)

### 5. Workflow Output Size Cap

- **What**: Caps the output size returned by `workflow.execute` sync strategy
- **Where**: `WorkflowExecuteSyncStrategy` before returning child workflow output
- **Limit**: `max-workflow-output-size` in YAML settings (default 5MB)
- **Error**: `WorkflowOutputSizeExceeded`

---

## Configuration

### New YAML Settings (under `settings:`)

```yaml
settings:
  max-steps: 150                    # Max steps in definition (default 150)
  max-total-output-size: '150mb'    # Cumulative output budget (default 150MB)
  max-workflow-output-size: '5mb'   # Max final workflow output (default 5MB)
```

### New Plugin Config (kibana.yml)

```yaml
xpack.workflowsExecutionEngine:
  maxCumulativeOutputSize: '150mb'
  maxWorkflowOutputSize: '5mb'
```

---

## Error Types

| Error | Type | Thrown By |
|-------|------|-----------|
| TemplateSizeLimitExceeded | Execution | SizeLimitedEmitter via WorkflowTemplatingEngine |
| WorkflowOutputBudgetExceeded | Execution | StepExecutionRuntime.finishStep() |
| WorkflowStepCountExceeded | Validation | validateStepCount() |
| WorkflowOutputSizeExceeded | Execution | WorkflowExecuteSyncStrategy |

---

## Resolution Chain (max-step-size for LiquidJS)

1. Step-level: `configuration['max-step-size']` from graph node
2. Workflow-level: `settings['max-step-size']`
3. Plugin config: `xpack.workflowsExecutionEngine.maxResponseSize`
4. Default: 10MB

Shared utility: `resolveMaxStepSizeBytes(node, workflowExecution, config)` in `errors.ts`

---

## Related Issues

- Epic: [elastic/security-team#15842](https://github.com/elastic/security-team/issues/15842)
- LiquidJS OOM: [elastic/security-team#16270](https://github.com/elastic/security-team/issues/16270)
- Loop guardrails: [elastic/security-team#15840](https://github.com/elastic/security-team/issues/15840)
- Workflow-level limits: [elastic/security-team#15837](https://github.com/elastic/security-team/issues/15837)
- Phase 1 PR: [elastic/kibana#254918](https://github.com/elastic/kibana/pull/254918)

---

## Limitations & Future Work

- LiquidJS `memoryLimit` and `renderLimit` remain as additional safety nets but don't prevent all OOM scenarios
- Kibana stack connectors (non-HTTP) cannot have Layer 1 pre-emptive enforcement - tracked separately
- No lazy context loading yet (all step outputs held in memory during execution)
- No per-field `postprocess` attribute to filter step output fields (planned future enhancement)

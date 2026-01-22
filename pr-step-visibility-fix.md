## Summary

Fixes an issue where step executions might not be visible in the UI immediately after a workflow completes.

## Problem

When a workflow execution finishes, step executions are written to Elasticsearch with `refresh: false` for performance. This means there can be up to ~1 second delay before steps become searchable. If the UI polls for the workflow execution right after it reaches terminal status, it may not see all the steps.

## Solution

Added an index refresh **only when needed**: when the workflow is in terminal status AND the initial search returns 0 steps. This ensures all steps are visible when the user views a completed workflow, while minimizing unnecessary refresh calls.

The refresh happens on the read side (management API) rather than the write side (execution engine), so:
- Workflow execution performance is not impacted
- The cost is only paid when someone actually requests the data
- Only terminal workflows with missing steps trigger the refresh
- Subsequent polls (after steps are visible) don't trigger refresh

## Changes

- `src/platform/plugins/shared/workflows_management/server/workflows_management/lib/get_workflow_execution.ts`
  - Search for steps first
  - If workflow is terminal AND steps.length === 0, refresh index and retry search

## Testing

- Existing tests pass
- Manual testing: Run step / Test workflow now shows all steps immediately after completion

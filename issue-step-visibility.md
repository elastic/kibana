# [Bug] [One Workflow] - step executions doesn't show (race condition with `refresh: false`)

## Description

When a workflow execution completes, step executions may not be visible in the UI immediately. The execution shows as "Completed" but the steps list is empty.

## Root Cause

Step executions are written to Elasticsearch with `refresh: false` for performance optimization. This means there can be up to ~1 second delay before steps become searchable. 

When the UI polls for the workflow execution right after it reaches terminal status, the search for steps may return 0 results because the index hasn't refreshed yet.

## Steps to Reproduce

1. Create a workflow with one or more steps
2. Click "Run step" or "Test workflow"
3. Observe the execution detail view
4. The workflow status shows "Completed" but steps may be missing initially

## Expected Behavior

All step executions should be visible immediately when viewing a completed workflow.

## Actual Behavior

Steps may not appear on the first poll after workflow completion, requiring additional polls (or manual refresh) to see them.

## Affected Functionality

- Run step (test individual step)
- Test workflow
- Viewing any completed workflow execution

## Solution

Refresh the steps index only when needed: when workflow is in terminal status AND initial search returns 0 steps. This ensures visibility while minimizing performance impact.

# Execution reads still on data clients

`workflows_management` still reaches execution and step documents through `workflowExecutionsDataClient` and `stepExecutionsDataClient`. Both come from `workflowsExecutionEngine.__internalStorage` in [`workflows_management_service.ts`](server/api/workflows_management_service.ts#L269).

Already on the engine start contract: one execution (`getWorkflowExecution`), a run's step page (`getExecutionStepExecutions`), child runs (`getChildExecutions`), and execution statuses (`getWorkflowExecutionStatuses`).

The start contract is read-only. Deletes and the HITL claim write have no public function yet.

## Public function already exists

These still call a data client. The engine function covers the same read.

| Management | Data client | Public function |
| --- | --- | --- |
| [`getWorkflowExecutions`](server/services/workflow_execution_query_service.ts#L195) via [`searchWorkflowExecutions`](server/api/lib/search_workflow_executions.ts#L79) | `workflowExecutionsDataClient.search` | `searchExecutions` |
| [`searchExecutionsView`](server/services/workflow_execution_query_service.ts#L278) via the same helper | `workflowExecutionsDataClient.search` | `searchExecutionView` |
| [`getWaitingStepExecutionId`](server/services/workflow_execution_query_service.ts#L869) | `getByIds` on both clients, then a step `search` | `getWaitingStepId` |
| [`getStepExecution`](server/services/workflow_execution_query_service.ts#L922) | `stepExecutionsDataClient.search` | `getStep` |
| [`getStepExecutions`](server/services/workflow_execution_query_service.ts#L392) via [`searchStepExecutions`](server/api/lib/search_step_executions.ts#L148) | `stepExecutionsDataClient.search` | `getStep` |
| [`hasRunningExecutions`](server/api/lib/workflow_deletion.ts#L37) | `workflowExecutionsDataClient.search` | `hasNonTerminalExecution` |
| [`getExecutionHistoryStats`](server/services/workflow_search_service.ts#L371) | `workflowExecutionsDataClient.search` | `getDailyExecutionCounts` |

`getWorkflowExecutions` and `searchExecutionsView` still pass a raw Elasticsearch query, including `accessControlFilter`. `searchExecutions` and `searchExecutionView` take structured filters and `visibility` (`all`, `deny`, or `exclude` workflow ids), not an arbitrary clause. `searchExecutionView` also takes KQL, while [`searchExecutionsView`](server/services/workflow_execution_query_service.ts#L287) pushes `params.query` as a query clause.

`getExecutionHistoryStats` passes the same kind of access-control clause. `getDailyExecutionCounts` takes `since`, `includeManaged`, and `visibility`.

## No matching public function

| Management | Data client | Why it does not fit |
| --- | --- | --- |
| [`searchStepExecutions`](server/services/workflow_execution_query_service.ts#L403) via [`searchStepExecutions`](server/api/lib/search_step_executions.ts#L148) | `stepExecutionsDataClient.search` | `searchSteps` has no `additionalQuery`. This helper also refuses a search that has neither a workflow id nor an execution id. |
| [`getWorkflowExecutionHistory`](server/services/workflow_execution_query_service.ts#L358) | `stepExecutionsDataClient.search` | Legacy history: filters `executionId`, sorts by `timestamp`, and reads `endedAt`. |
| [`listWaitingForInputSteps`](server/services/workflow_execution_query_service.ts#L456) | `stepExecutionsDataClient.search` | `searchSteps` can express the open `waiting_for_input` query. The access-control clause is still raw. |
| [`listProcessedWaitForInputSteps`](server/services/workflow_execution_query_service.ts#L570) | `stepExecutionsDataClient.search` | Sorts by `hitl.respondedAt` then `finishedAt`. `searchSteps` accepts one sort. |
| [`listProcessedWaitForInputFacets`](server/services/workflow_execution_query_service.ts#L680) | `stepExecutionsDataClient.search` | `getStepFacets` covers the buckets. Same access-control gap. |
| [`resolvePredecessorReasoning`](server/services/workflow_execution_query_service.ts#L730) | `stepExecutionsDataClient.search` | Sorts by `workflowRunId` then `finishedAt`. `searchSteps` cannot express that sort. `includeFields` can already limit the hit to `output.reasoning`. |
| [`getRecentExecutionsForWorkflows`](server/services/workflow_search_service.ts#L437) | `workflowExecutionsDataClient.search` | `top_hits` of the latest execution per workflow. |

## Writes

| Management | Data client |
| --- | --- |
| [`markStepAsResponded`](server/services/workflow_execution_query_service.ts#L952) | `stepExecutionsDataClient.bulk` |
| [`purgeWorkflowRelatedData`](server/api/lib/workflow_deletion.ts#L200) | `deleteByQuery` on both clients |

[`WorkflowCrudService`](server/services/workflow_crud_service.ts#L1282) passes both clients into that purge, from [`deleteWorkflows`](server/services/workflow_crud_service.ts#L1286) and [`deleteWorkflowsInSpace`](server/services/workflow_crud_service.ts#L1350).

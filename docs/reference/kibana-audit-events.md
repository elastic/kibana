---
navigation_title: Kibana audit events
---

# Kibana audit events

Audit logging is a [subscription feature](https://www.elastic.co/subscriptions) that you can enable to keep track of security-related events, such as authorization success and failures. Logging these events enables you to monitor Kibana for suspicious activity and provides evidence in the event of an attack.

Refer to [enabling](docs-content://deploy-manage/security/logging-configuration/enabling-audit-logs.md) and [configuring](docs-content://deploy-manage/security/logging-configuration/configuring-audit-logs.md) audit logs for details on activation and tunning.

## Kibana audit events [xpack-security-ecs-audit-logging]

This section describes {{kib}} events that can be logged for auditing purposes.

Each event is broken down into `category`, `type`, `action`, and `outcome` fields to make it easy to filter, query and aggregate the resulting logs. The `trace.id` field can be used to correlate multiple events that originate from the same request.

Refer to [audit schema](#xpack-security-ecs-audit-schema) for a table of fields logged with audit events.

::::{note}
To ensure that a record of every operation is persisted even in case of an unexpected error, asynchronous write operations are logged immediately after all authorization checks have passed, but before the response from {{es}} is received. Refer to the corresponding {{es}} logs for potential write errors.
::::

### Category: authentication

| **Action** | **Outcome** | **Description** |
| --- | --- | --- |
| `user_login` | `success` | User has logged in successfully. |
| | `failure` | Failed login attempt (e.g. due to invalid credentials). |
| `user_logout` | `unknown` | User is logging out. |
| `session_cleanup` | `unknown` | Removing invalid or expired session. |
| `access_agreement_acknowledged` | n/a | User has acknowledged the access agreement. |
| `service_account_assume` {applies_to}`stack: preview 9.6+` | `success` | Workload [plugin/type/id] is executing as service account [id=x]. Every event the workload causes while it runs shares this event's `trace.id`. |
| | `failure` | Workload [plugin/type/id] failed to execute as service account [id=x]. Logged when the workload starts, or when it loses its credential while it runs. The account was deleted, or recreated after the workload was bound, its credential was refused, the binding failed integrity verification, or the workload was bound to a different account or unbound. A temporary failure, such as an unavailable {{es}} cluster, is not logged. The account is omitted when the binding failed integrity verification. |

::::{note}
For `service_account_assume`, the service account is the actor: `user.id` and `user.name` are the account id, and `user.roles` is omitted. A workload that runs often writes one event per run. To drop the successful ones, add `{ actions: ['service_account_assume'], outcomes: ['success'] }` to `xpack.security.audit.ignore_filters`.
::::

### Category: database
#### Type: creation

| **Action** | **Outcome** | **Description** |
| --- | --- | --- |
| `saved_object_create` | `unknown` | User is creating a saved object. |
| | `failure` | User is not authorized to create a saved object. |
| `saved_object_open_point_in_time` | `unknown` | User is creating a Point In Time to use when querying saved objects. |
| | `failure` | User is not authorized to create a Point In Time for the provided saved object types. |
| `connector_create` | `unknown` | User is creating a connector. |
| | `failure` | User is not authorized to create a connector. |
| `rule_create` | `unknown` | User is creating a rule. |
| | `failure` | User is not authorized to create a rule. |
| `ad_hoc_run_create` | `unknown` | User is creating an ad hoc run. |
| | `failure` | User is not authorized to create an ad hoc run. |
| `space_create` | `unknown` | User is creating a space. |
| | `failure` | User is not authorized to create a space. |
| `case_create` | `unknown` | User is creating a case. |
| | `failure` | User is not authorized to create a case. |
| `case_configuration_create` | `unknown` | User is creating a case configuration. |
| | `failure` | User is not authorized to create a case configuration. |
| `case_comment_create` | `unknown` | User is creating a case comment. |
| | `failure` | User is not authorized to create a case comment. |
| `case_comment_bulk_create` | `unknown` | User is creating multiple case comments. |
| | `failure` | User is not authorized to create multiple case comments. |
| `case_user_action_create_comment` | `success` | User has created a case comment. |
| `case_user_action_create_case` | `success` | User has created a case. |
| `ml_put_ad_job` | `success` | Creating anomaly detection job. |
| | `failure` | Failed to create anomaly detection job. |
| `ml_put_ad_datafeed` | `success` | Creating anomaly detection datafeed. |
| | `failure` | Failed to create anomaly detection datafeed. |
| `ml_put_calendar` | `success` | Creating calendar. |
| | `failure` | Failed to create calendar. |
| `ml_post_calendar_events` | `success` | Adding events to calendar. |
| | `failure` | Failed to add events to calendar. |
| `ml_forecast` | `success` | Creating anomaly detection forecast. |
| | `failure` | Failed to create anomaly detection forecast. |
| `ml_put_filter` | `success` | Creating filter. |
| | `failure` | Failed to create filter. |
| `ml_put_dfa_job` | `success` | Creating data frame analytics job. |
| | `failure` | Failed to create data frame analytics job. |
| `ml_put_trained_model` | `success` | Creating trained model. |
| | `failure` | Failed to create trained model. |
| `product_documentation_create` | `unknown` | User requested to install the product documentation for use in AI Assistants. |
| `knowledge_base_entry_create` | `success` | User has created knowledge base entry [id=x] |
| | `failure` | Failed attempt to create a knowledge base entry |
| `knowledge_base_entry_update` | `success` | User has updated knowledge base entry [id=x] |
| | `failure` | Failed attempt to update a knowledge base entry |
| `knowledge_base_entry_delete` | `success` | User has deleted knowledge base entry [id=x] |
| | `failure` | Failed attempt to delete a knowledge base entry |
| `workflow_create` {applies_to}`stack: preview 9.4+` | `success` | User has created a workflow [id=x]. |
| | `failure` | Failed attempt to create a workflow. |
| `workflow_bulk_create` {applies_to}`stack: preview 9.4+` | `success` | User has created a workflow via bulk import [id=x]. One event is written per workflow. |
| | `failure` | Failed attempt to create a workflow via bulk import. |
| `workflow_clone` {applies_to}`stack: preview 9.4+` | `success` | User has cloned a workflow [sourceId=x] to [id=y]. |
| | `failure` | Failed attempt to clone a workflow [id=x]. |

#### Type: change

| **Action** | **Outcome** | **Description** |
| --- | --- | --- |
| `saved_object_update` | `unknown` | User is updating a saved object. |
| | `failure` | User is not authorized to update a saved object. |
| `saved_object_update_objects_spaces` | `unknown` | User is adding and/or removing a saved object to/from other spaces. |
| | `failure` | User is not authorized to add or remove a saved object to or from other spaces. |
| `saved_object_remove_references` | `unknown` | User is removing references to a saved object. |
| | `failure` | User is not authorized to remove references to a saved object. |
| `saved_object_collect_multinamespace_references` | `success` | User has accessed references to a multi-space saved object. |
| | `failure` | User is not authorized to access references to a multi-space saved object. |
| `connector_update` | `unknown` | User is updating a connector. |
| | `failure` | User is not authorized to update a connector. |
| `rule_update` | `unknown` | User is updating a rule. |
| | `failure` | User is not authorized to update a rule. |
| `rule_update_api_key` | `unknown` | User is updating the API key of a rule. |
| | `failure` | User is not authorized to update the API key of a rule. |
| `rule_enable` | `unknown` | User is enabling a rule. |
| | `failure` | User is not authorized to enable a rule. |
| `rule_disable` | `unknown` | User is disabling a rule. |
| | `failure` | User is not authorized to disable a rule. |
| `rule_mute` | `unknown` | User is muting a rule. |
| | `failure` | User is not authorized to mute a rule. |
| `rule_unmute` | `unknown` | User is unmuting a rule. |
| | `failure` | User is not authorized to unmute a rule. |
| `rule_alert_mute` | `unknown` | User is muting an alert. |
| | `failure` | User is not authorized to mute an alert. |
| `rule_alert_unmute` | `unknown` | User is unmuting an alert. |
| | `failure` | User is not authorized to unmute an alert. |
| `space_update` | `unknown` | User is updating a space. |
| | `failure` | User is not authorized to update a space. |
| `alert_update` | `unknown` | User is updating an alert. |
| | `failure` | User is not authorized to update an alert. |
| `rule_snooze` | `unknown` | User is snoozing a rule. |
| | `failure` | User is not authorized to snooze a rule. |
| `rule_unsnooze` | `unknown` | User is unsnoozing a rule. |
| | `failure` | User is not authorized to unsnooze a rule. |
| `alert_acknowledge` {applies_to}`stack: ga 9.4+` | `unknown` | User is acknowledging an alert (updating workflow status). |
| | `failure` | User is not authorized to acknowledge an alert. |
| `alert_unacknowledge` {applies_to}`stack: ga 9.4+` | `success` | User has unacknowledged an alert (reverted workflow status to open). |
| | `failure` | User is not authorized to unacknowledge an alert. |
| `case_update` | `unknown` | User is updating a case. |
| | `failure` | User is not authorized to update a case. |
| `case_push` | `unknown` | User is pushing a case to an external service. |
| | `failure` | User is not authorized to push a case to an external service. |
| `case_configuration_update` | `unknown` | User is updating a case configuration. |
| | `failure` | User is not authorized to update a case configuration. |
| `case_comment_update` | `unknown` | User is updating a case comment. |
| | `failure` | User is not authorized to update a case comment. |
| `case_user_action_add_case_assignees` | `success` | User has added a case assignee. |
| `case_user_action_update_case_connector` | `success` | User has updated a case connector. |
| `case_user_action_update_case_description` | `success` | User has updated a case description. |
| `case_user_action_update_case_settings` | `success` | User has updated the case settings. |
| `case_user_action_update_case_severity` | `success` | User has updated the case severity. |
| `case_user_action_update_case_status` | `success` | User has updated the case status. |
| `case_user_action_pushed_case` | `success` | User has pushed a case to an external service. |
| `case_user_action_add_case_tags` | `success` | User has added tags to a case. |
| `case_user_action_update_case_title` | `success` | User has updated the case title. |
| `ml_open_ad_job` | `success` | Opening anomaly detection job. |
| | `failure` | Failed to open anomaly detection job. |
| `ml_close_ad_job` | `success` | Closing anomaly detection job. |
| | `failure` | Failed to close anomaly detection job. |
| `ml_start_ad_datafeed` | `success` | Starting anomaly detection datafeed. |
| | `failure` | Failed to start anomaly detection datafeed. |
| `ml_stop_ad_datafeed` | `success` | Stopping anomaly detection datafeed. |
| | `failure` | Failed to stop anomaly detection datafeed. |
| `ml_update_ad_job` | `success` | Updating anomaly detection job. |
| | `failure` | Failed to update anomaly detection job. |
| `ml_reset_ad_job` | `success` | Resetting anomaly detection job. |
| | `failure` | Failed to reset anomaly detection job. |
| `ml_revert_ad_snapshot` | `success` | Reverting anomaly detection snapshot. |
| | `failure` | Failed to revert anomaly detection snapshot. |
| `ml_update_ad_datafeed` | `success` | Updating anomaly detection datafeed. |
| | `failure` | Failed to update anomaly detection datafeed. |
| `ml_put_calendar_job` | `success` | Adding job to calendar. |
| | `failure` | Failed to add job to calendar. |
| `ml_delete_calendar_job` | `success` | Removing job from calendar. |
| | `failure` | Failed to remove job from calendar. |
| `ml_update_filter` | `success` | Updating filter. |
| | `failure` | Failed to update filter. |
| `ml_start_dfa_job` | `success` | Starting data frame analytics job. |
| | `failure` | Failed to start data frame analytics job. |
| `ml_stop_dfa_job` | `success` | Stopping data frame analytics job. |
| | `failure` | Failed to stop data frame analytics job. |
| `ml_update_dfa_job` | `success` | Updating data frame analytics job. |
| | `failure` | Failed to update data frame analytics job. |
| `ml_start_trained_model_deployment` | `success` | Starting trained model deployment. |
| | `failure` | Failed to start trained model deployment. |
| `ml_stop_trained_model_deployment` | `success` | Stopping trained model deployment. |
| | `failure` | Failed to stop trained model deployment. |
| `ml_update_trained_model_deployment` | `success` | Updating trained model deployment. |
| | `failure` | Failed to update trained model deployment. |
| `product_documentation_update` | `unknown` | User requested to update the product documentation for use in AI Assistants. |
| `workflow_update` {applies_to}`stack: preview 9.4+` | `success` | User has updated a workflow [id=x]. |
| | `failure` | Failed attempt to update a workflow [id=x]. |
| `workflow_restore` {applies_to}`stack: preview 9.5+` | `success` | User has restored a workflow from history [id=x]. |
| | `failure` | Failed attempt to restore a workflow from history [id=x]. |
| `workflow_run` {applies_to}`stack: preview 9.4+` | `success` | User has started a workflow execution [id=x] [executionId=y]. |
| | `failure` | Failed attempt to run a workflow [id=x]. |
| `workflow_test` {applies_to}`stack: preview 9.4+` | `success` | User has tested a workflow. |
| | `failure` | Failed attempt to test a workflow. |
| `workflow_test_step` {applies_to}`stack: preview 9.4+` | `success` | User has tested a workflow step [stepId=x]. |
| | `failure` | Failed attempt to test a workflow step [stepId=x]. |
| `workflow_execution_cancel` {applies_to}`stack: preview 9.4+` | `success` | User has canceled a workflow execution [executionId=x]. Canceling every active execution writes one event per execution. |
| | `failure` | Failed attempt to cancel a workflow execution. |
| `workflow_execution_resume` {applies_to}`stack: preview 9.4+` | `success` | User has resumed a workflow execution [executionId=x]. |
| | `failure` | Failed attempt to resume a workflow execution [executionId=x]. |
| `workflow_hitl_waiting` {applies_to}`stack: preview 9.5+` | `success` | A workflow execution is waiting for human input or approval [executionId=x]. |
| `workflow_hitl_timed_out` {applies_to}`stack: preview 9.5+` | `success` | A workflow human-input or approval wait has timed out [executionId=x]. |

#### Type: deletion

| **Action** | **Outcome** | **Description** |
| --- | --- | --- |
| `saved_object_delete` | `unknown` | User is deleting a saved object. |
| | `failure` | User is not authorized to delete a saved object. |
| `saved_object_close_point_in_time` | `unknown` | User is deleting a Point In Time that was used to query saved objects. |
| | `failure` | User is not authorized to delete a Point In Time. |
| `connector_delete` | `unknown` | User is deleting a connector. |
| | `failure` | User is not authorized to delete a connector. |
| `rule_delete` | `unknown` | User is deleting a rule. |
| | `failure` | User is not authorized to delete a rule. |
| `ad_hoc_run_delete` | `unknown` | User is deleting an ad hoc run. |
| | `failure` | User is not authorized to delete an ad hoc run. |
| `space_delete` | `unknown` | User is deleting a space. |
| | `failure` | User is not authorized to delete a space. |
| `case_delete` | `unknown` | User is deleting a case. |
| | `failure` | User is not authorized to delete a case. |
| `case_comment_delete_all` | `unknown` | User is deleting all comments associated with a case. |
| | `failure` | User is not authorized to delete all comments associated with a case. |
| `case_comment_delete` | `unknown` | User is deleting a case comment. |
| | `failure` | User is not authorized to delete a case comment. |
| `case_user_action_delete_case_assignees` | `success` | User has removed a case assignee. |
| `case_user_action_delete_comment` | `success` | User has deleted a case comment. |
| `case_user_action_delete_case` | `success` | User has deleted a case. |
| `case_user_action_delete_case_tags` | `success` | User has removed tags from a case. |
| `ml_delete_ad_job` | `success` | Deleting anomaly detection job. |
| | `failure` | Failed to delete anomaly detection job. |
| `ml_delete_model_snapshot` | `success` | Deleting model snapshot. |
| | `failure` | Failed to delete model snapshot. |
| `ml_delete_ad_datafeed` | `success` | Deleting anomaly detection datafeed. |
| | `failure` | Failed to delete anomaly detection datafeed. |
| `ml_delete_calendar` | `success` | Deleting calendar. |
| | `failure` | Failed to delete calendar. |
| `ml_delete_calendar_event` | `success` | Deleting calendar event. |
| | `failure` | Failed to delete calendar event. |
| `ml_delete_filter` | `success` | Deleting filter. |
| | `failure` | Failed to delete filter. |
| `ml_delete_forecast` | `success` | Deleting forecast. |
| | `failure` | Failed to delete forecast. |
| `ml_delete_dfa_job` | `success` | Deleting data frame analytics job. |
| | `failure` | Failed to delete data frame analytics job. |
| `ml_delete_trained_model` | `success` | Deleting trained model. |
| | `failure` | Failed to delete trained model. |
| `product_documentation_delete` | `unknown` | User requested to delete the product documentation for use in AI Assistants. |
| `workflow_delete` {applies_to}`stack: preview 9.4+` | `success` | User has deleted a workflow [id=x]. A forced delete includes `(force)` in the message. |
| | `failure` | Failed attempt to delete a workflow [id=x]. |
| `workflow_bulk_delete` {applies_to}`stack: preview 9.4+` | `success` | User has deleted a workflow via bulk delete [id=x]. One event is written per workflow. |
| | `failure` | Failed attempt to delete a workflow via bulk delete. |

#### Type: access

| **Action** | **Outcome** | **Description** |
| --- | --- | --- |
| `saved_object_get` | `success` | User has accessed a saved object. |
| | `failure` | User is not authorized to access a saved object. |
| `saved_object_resolve` | `success` | User has accessed a saved object. |
| | `failure` | User is not authorized to access a saved object. |
| `saved_object_find` | `success` | User has accessed a saved object as part of a search operation. |
| | `failure` | User is not authorized to search for saved objects. |
| `connector_get` | `success` | User has accessed a connector. |
| | `failure` | User is not authorized to access a connector. |
| `connector_find` | `success` | User has accessed a connector as part of a search operation. |
| | `failure` | User is not authorized to search for connectors. |
| `rule_get` | `success` | User has accessed a rule. |
| | `failure` | User is not authorized to access a rule. |
| `rule_get_execution_log` | `success` | User has accessed execution log for a rule. |
| | `failure` | User is not authorized to access execution log for a rule. |
| `rule_find` | `success` | User has accessed a rule as part of a search operation. |
| | `failure` | User is not authorized to search for rules. |
| `rule_schedule_backfill` | `success` | User has accessed a rule as part of a backfill schedule operation. |
| | `failure` | User is not authorized to access rule for backfill scheduling. |
| `ad_hoc_run_get` | `success` | User has accessed an ad hoc run. |
| | `failure` | User is not authorized to access ad hoc run. |
| `ad_hoc_run_find` | `success` | User has accessed an ad hoc run as part of a search operation. |
| | `failure` | User is not authorized to search for ad hoc runs. |
| `space_get` | `success` | User has accessed a space. |
| | `failure` | User is not authorized to access a space. |
| `space_find` | `success` | User has accessed a space as part of a search operation. |
| | `failure` | User is not authorized to search for spaces. |
| `alert_get` | `success` | User has accessed an alert. |
| | `failure` | User is not authorized to access an alert. |
| `alert_find` | `success` | User has accessed an alert as part of a search operation. |
| | `failure` | User is not authorized to access alerts. |
| `case_get` | `success` | User has accessed a case. |
| | `failure` | User is not authorized to access a case. |
| `case_bulk_get` | `success` | User has accessed multiple cases. |
| | `failure` | User is not authorized to access multiple cases. |
| `case_resolve` | `success` | User has accessed a case. |
| | `failure` | User is not authorized to access a case. |
| `case_find` | `success` | User has accessed a case as part of a search operation. |
| | `failure` | User is not authorized to search for cases. |
| `case_ids_by_alert_id_get` | `success` | User has accessed cases. |
| | `failure` | User is not authorized to access cases. |
| `case_get_metrics` | `success` | User has accessed metrics for a case. |
| | `failure` | User is not authorized to access metrics for a case. |
| `cases_get_metrics` | `success` | User has accessed metrics for cases. |
| | `failure` | User is not authorized to access metrics for cases. |
| `case_configuration_find` | `success` | User has accessed a case configuration as part of a search operation. |
| | `failure` | User is not authorized to search for case configurations. |
| `case_comment_get_metrics` | `success` | User has accessed metrics for case comments. |
| | `failure` | User is not authorized to access metrics for case comments. |
| `case_comment_alerts_attach_to_case` | `success` | User has accessed case alerts. |
| | `failure` | User is not authorized to access case alerts. |
| `case_comment_get` | `success` | User has accessed a case comment. |
| | `failure` | User is not authorized to access a case comment. |
| `case_comment_bulk_get` | `success` | User has accessed multiple case comments. |
| | `failure` | User is not authorized to access multiple case comments. |
| `case_comment_get_all` | `success` | User has accessed case comments. |
| | `failure` | User is not authorized to access case comments. |
| `case_comment_find` | `success` | User has accessed a case comment as part of a search operation. |
| | `failure` | User is not authorized to search for case comments. |
| `case_categories_get` | `success` | User has accessed a case. |
| | `failure` | User is not authorized to access a case. |
| `case_tags_get` | `success` | User has accessed a case. |
| | `failure` | User is not authorized to access a case. |
| `case_reporters_get` | `success` | User has accessed a case. |
| | `failure` | User is not authorized to access a case. |
| `case_find_statuses` | `success` | User has accessed a case as part of a search operation. |
| | `failure` | User is not authorized to search for cases. |
| `case_user_actions_get` | `success` | User has accessed the user activity of a case. |
| | `failure` | User is not authorized to access the user activity of a case. |
| `case_user_actions_find` | `success` | User has accessed the user activity of a case as part of a search operation. |
| | `failure` | User is not authorized to access the user activity of a case. |
| `case_user_action_get_metrics` | `success` | User has accessed metrics for the user activity of a case. |
| | `failure` | User is not authorized to access metrics for the user activity of a case. |
| `case_user_action_get_users` | `success` | User has accessed the users associated with a case. |
| | `failure` | User is not authorized to access the users associated with a case. |
| `case_connectors_get` | `success` | User has accessed the connectors of a case. |
| | `failure` | User is not authorized to access the connectors of a case. |
| `ml_infer_trained_model` | `success` | Inferring using trained model. |
| | `failure` | Failed to infer using trained model. |
| `workflow_get` {applies_to}`stack: preview 9.4+` | `success` | User has accessed a workflow [id=x]. |
| | `failure` | Failed attempt to read a workflow [id=x]. |
| `workflow_mget` {applies_to}`stack: preview 9.4+` | `success` | User has requested workflows by id. The message includes the requested and returned counts. |
| | `failure` | Failed attempt to read workflows by id. |
| `workflow_export` {applies_to}`stack: preview 9.4+` | `success` | User has exported a workflow [id=x]. One event is written per workflow. |
| | `failure` | Failed attempt to export workflows. |

::::{note}
Workflow events (`workflow_*`) are logged after the operation finishes, with `event.outcome` of `success` or `failure`. When no user request is available (for example a human-in-the-loop wait, timeout, or system cancel), the message actor is `System`. Managed workflows append `[managed=true]` to the message, plus `originalWorkflowId`, `ownerPlugin`, `space`, and `reason` when those values are present.
::::

### Category: iam
#### Type: creation

| **Action** | **Outcome** | **Description** |
| --- | --- | --- |
| `service_account_create` {applies_to}`stack: preview 9.6+` | `success` | User has created service account [id=x, name=y]. Logged after the account exists, so the event carries the id the backend assigned. |
| | `failure` | Failed attempt to create service account [name=y]: the user is not authorized. The name is omitted when it did not pass validation. |
| | `unknown` | Failed attempt to create service account [id=x, name=y], which might have been left behind. The create failed after writing to {{es}} and {{kib}} could not confirm that it removed the partially created account. Refer to the {{kib}} server logs. |

#### Type: change

| **Action** | **Outcome** | **Description** |
| --- | --- | --- |
| `service_account_workload_bind` {applies_to}`stack: preview 9.6+` | `unknown` | User is binding service account [id=x] to workload [plugin/type/id]. Binding a workload that is already bound to a different account also writes a `service_account_workload_unbind` event for that account first. |
| | `failure` | Failed attempt to bind service account [id=x] to workload [plugin/type/id]: the user is not authorized. |
| `service_account_workload_unbind` {applies_to}`stack: preview 9.6+` | `unknown` | User is unbinding service account [id=x] from workload [plugin/type/id]. When the workload has no binding, or the stored binding failed integrity verification, the message drops `[id=x]` and `user.target` is omitted. |
| | `failure` | Failed attempt to unbind service account from workload [plugin/type/id]: the user is not authorized. |

#### Type: deletion

| **Action** | **Outcome** | **Description** |
| --- | --- | --- |
| `service_account_delete` {applies_to}`stack: preview 9.6+` | `unknown` | User is deleting service account [id=x]. A forced delete, which skips the check for bound workloads and leaves their bindings behind, appends `[force=true]` to the message. |
| | `failure` | Failed attempt to delete service account [id=x]: the user is not authorized. A forced delete appends `[force=true]` to this message too. |

::::{note}
Following ECS, every event in this category has two values in `event.type`: the type it is listed under and `user`, for example `[user, creation]`. An `ignore_filters` rule that matches on `types` has to list both.

Across the `service_account_*` events, `failure` means the user was not authorized. Other errors, such as a missing license or encryption key or an invalid request, leave no event. Binding and delete events follow the convention for writes: `unknown` is logged once the user is authorized and before the write, so it records the attempt, not the result. It is also written when an unbind matches no binding or a delete names no account, and a write that later fails or is refused leaves no further event. Refer to the {{kib}} server logs for write errors. A delete refused because workloads are still bound to the account leaves no event. `service_account_create` is logged after the operation instead, because the backend assigns the id.
::::

### Category: web

| **Action** | **Outcome** | **Description** |
| --- | --- | --- |
| `http_request` | `unknown` | User is making an HTTP request. |


## Audit schema [xpack-security-ecs-audit-schema]

Audit logs are written in JSON using the [Elastic Common Schema (ECS)](ecs://reference/index.md) specification.

{applies_to}`serverless: preview` In {{serverless-full}}, {{kib}} audit logs delivered through [audit trail log delivery](docs-content://deploy-manage/monitor/log-delivery/audit-trail.md) use OpenTelemetry field names. Refer to [Serverless OpenTelemetry field names](#serverless-otel-field-names) for more information.

### Base fields

| **Field** | **Description** |
| --- | --- |
| `@timestamp` | Time when the event was generated.<br>Example: `2016-05-23T08:05:34.853Z` |
| `message` | Human readable description of the event. |

### Event fields

| **Field** | **Description** |
| --- | --- |
| `event.action` | The action captured by the event.<br>Refer to [Audit events](./kibana-audit-events.md#xpack-security-ecs-audit-logging) for a table of possible actions. |
| `event.category` | High level category associated with the event.<br>This field is closely related to `event.type`, which is used as a subcategory.<br>Possible values:`database`,`web`,`authentication`,`iam` |
| `event.type` | Subcategory associated with the event.<br>This field can be used along with the `event.category` field to enable filtering events down to a level appropriate for single visualization.<br>Possible values:`creation`,`access`,`change`,`deletion`,`start`,`user` |
| `event.outcome` | Denotes whether the event represents a success or failure:<br><br>* Any actions that the user is not authorized to perform are logged with outcome:  `failure`<br>* Authorized read operations are only logged after successfully fetching the data from {{es}} with outcome: `success`<br>* Authorized create, update, or delete operations are logged before attempting the operation in {{es}} with outcome: `unknown`, unless the event's own description says otherwise (for example `service_account_create` is logged after the operation)<br><br>Possible values: `success`, `failure`, `unknown`<br> |

### User fields

| **Field** | **Description** |
| --- | --- |
| `user.id` | Unique identifier of the user across sessions (See [user profiles](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/user-profiles.md)).<br>For a service account, the account id. |
| `user.name` | Login name of the user.<br>For a service account, the account id.<br>Example: `jdoe` |
| `user.email` | Email address of the user at the time of the event, when provided by the identity source. |
| `user.full_name` | Full name of the user at the time of the event, when provided by the identity source. |
| `user.roles[]` | Set of user roles at the time of the event.<br>Example: `[kibana_admin, reporting_user]` |
| `user.target.id` | ID of the service account the event targets.<br>Example: `kibana/nightshift-relay` |
| `user.target.name` | Name of the service account the event targets.<br>Example: `nightshift-relay` |


### Kibana fields

| **Field** | **Description** |
| --- | --- |
| `kibana.space_id` | ID of the space associated with the event.<br>Example: `default` |
| `kibana.session_id` | ID of the user session associated with the event.<br>Each login attempt results in a unique session id. |
| `kibana.saved_object.type` | Type of saved object associated with the event.<br>Example: `dashboard` |
| `kibana.saved_object.id` | ID of the saved object associated with the event. |
| `kibana.workload.plugin_id` | ID of the plugin that owns the workload a service account is bound to, or is executing for, as part of the event.<br>Example: `workflowsManagement` |
| `kibana.workload.type` | Type of the workload.<br>Example: `workflow` |
| `kibana.workload.id` | ID of the workload. |
| `kibana.workload.execution_id` | ID of the run of the workload, when the plugin executing it supplied one. Recorded on `service_account_assume` events.<br>Example: the workflow execution ID |
| `kibana.authentication_provider` | Name of the authentication provider associated with the event.<br>Example: `my-saml-provider` |
| `kibana.authentication_type` | Type of the authentication provider associated with the event.<br>Example: `saml` |
| `kibana.authentication_realm` | Name of the Elasticsearch realm that has authenticated the user.<br>Example: `native` |
| `kibana.lookup_realm` | Name of the Elasticsearch realm where the user details were retrieved from.<br>Example: `native` |
| `kibana.add_to_spaces[]` | Set of space IDs that a saved object is being shared to as part of the event.<br>Example: `[default, marketing]` |
| `kibana.delete_from_spaces[]` | Set of space IDs that a saved object is being removed from as part of the event.<br>Example: `[marketing]` |

### Error fields

| **Field** | **Description** |
| --- | --- |
| `error.code` | Error code describing the error. |
| `error.message` | Error message. |


### HTTP and URL fields

| **Field** | **Description** |
| --- | --- |
| `client.ip` | Client IP address. |
| `http.request.method` | HTTP request method.<br>Example: `get`, `post`, `put`, `delete` |
| `http.request.headers.x-forwarded-for` | `X-Forwarded-For` request header used to identify the originating client IP address when connecting through proxy servers.<br>Example: `161.66.20.177, 236.198.214.101` |
| `url.domain` | Domain of the URL.<br>Example: `www.elastic.co` |
| `url.path` | Path of the request.<br>Example: `/search` |
| `url.port` | Port of the request.<br>Example: `443` |
| `url.query` | The query field describes the query string of the request.<br>Example: `q=elasticsearch` |
| `url.scheme` | Scheme of the request.<br>Example: `https` |


### Tracing fields

| **Field** | **Description** |
| --- | --- |
| `trace.id` | Unique identifier allowing events of the same transaction from {{kib}} and {{es}} to be correlated. |

### Serverless OpenTelemetry field names [serverless-otel-field-names]

```{applies_to}
serverless: preview
```

In {{serverless-full}}, {{kib}} audit logs are delivered through [audit trail log delivery](docs-content://deploy-manage/monitor/log-delivery/audit-trail.md) and use the following OpenTelemetry field names instead of the ECS fields in the [audit schema](#xpack-security-ecs-audit-schema). This mapping is specific to {{serverless-full}}. On self-managed and {{ech}} deployments, the `otel` appender ships the ECS audit schema fields unchanged.

| **Audit schema field** | **OpenTelemetry field** |
| --- | --- |
| `trace.id` | `http.request.id` |
| `kibana.space_id` | `kibana.space.id` |
| `kibana.session_id` | `kibana.session.id` |
| `kibana.authentication_type` | `authentication.type` |
| `kibana.authentication_realm` | `user.domain` |
| `http.request.headers.x-forwarded-for` | `network.forwarded_ip` |
| `client.ip` | `source.address` and `source.ip` |
| `url.scheme`, `url.domain`, and `url.path` | Omitted. `url.original` is added when all three are non-empty strings. |
| `url.port` | Omitted |
| `url.query` | Omitted |
| `kibana.authentication_provider` | Omitted |
| `kibana.lookup_realm` | Omitted |

`url.original` is written when `url.scheme`, `url.domain`, and `url.path` are all non-empty strings. The value is `scheme://domain/path`, as in `https://www.elastic.co/search`. `url.scheme`, `url.domain`, `url.path`, `url.port`, and `url.query` are removed from the log record.

`http.request.method` uses uppercase values, such as `GET`, `POST`, `PUT`, and `DELETE`.

`user.id` is the user's login name, the same value as `user.name`. When the event has no login name, the log record omits `user.id`.

`user.domain` is the name of the {{es}} realm that authenticated the user. It is present on successful `user_login` events and on events logged for authenticated requests. Events that do not carry the realm, such as `user_logout` and `session_cleanup`, omit it even when `user.name` is set.

When the event has no `event.type`, the log record sets `event.type` to `["access"]`. When the event has no `log.type`, the log record sets `log.type` to `audit`.

The log resource includes only `service.name`, set to `serverless-kibana`, and `service.type`, set to `kibana`, so detected attributes such as `host.name` stay off the resource. `project.id` is written on each log record rather than on the resource. `service.version` is removed from the log record.

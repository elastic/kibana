---
navigation_title: "Known issues"
---

# Kibana known issues

For Elastic {{observability}} known issues, refer to [Elastic Observability known issues](docs-content://release-notes/elastic-observability/known-issues.md).

For Elastic Security known issues, refer to [Elastic Security known issues](docs-content://release-notes/elastic-security/known-issues.md).

::::{dropdown} Dashboard Copy link doesn't work when sharing from a space other than the default space

Applies to: {{stack}} 9.0.3

**Details**

When attempting to share a dashboard from a space that isn't the default space, the **Copy link** action never completes.

**Action**

To avoid this error, don't upgrade {{kib}} to {{stack}} 9.0.3 or upgrade {{kib}} to {{stack}} 9.0.4 when available.

**Resolved**

This issue is resolved in {{stack}} 9.0.4.

::::

::::{dropdown} Upgrading Kibana from 8.18.x to 9.0.2 fails due to a configuration conflict in the kibana.yml file

Applies to: {{stack}} 9.0.2

**Details**

Upgrading {{kib}} from version 8.18.x to 9.0.2 fails due to a configuration conflict if `xpack.alerting.cancelAlertsOnRuleTimeout` is set to `false` in the `kibana.yml` file. {{kib}} fails to boot and shows a fatal error message in the {{kib}} logs that's similar to the following:

````
FATAL Error: Rule type "transform_health" cannot have both cancelAlertsOnRuleTimeout set to false and autoRecoverAlerts set to true.
````

This failure occurs when the `xpack.alerting.cancelAlertsOnRuleTimeout` setting is set to `false`, which is incompatible with the default configuration of an internal setting (`autoRecoverAlerts`) in 9.0.2.


**Action**

To temporarily resolve the issue and allow the upgrade to proceed, follow these steps:

1. Remove the `xpack.alerting.cancelAlertsOnRuleTimeout: false` setting from the `kibana.yml` file.
2. Restart {{kib}} to apply the changes.

**Resolved**

This was resolved in {{stack}} 9.0.3.

::::

::::{dropdown} Errors in rule executions occur when maintenance windows have filters

Applies to: {{stack}} 9.0.0, 9.0.1, 9.0.2

**Details** 
Errors occur when rules run during an active maintenance window that has filters and a matching rule category. 

**Workaround** 
Remove any filters added to the active maintenance window.

**Resolved**

This was resolved in {{stack}} 9.0.3.

::::

::::{dropdown} Issue with follower indices during upgrade
:name: ua-follower-indices

Applies to: {{stack}} 9.0.0

**Details**

In Upgrade Assistant, follower indices may be identified to be reindexed. However, this is not a valid migration path and will result in an error. Instead, the recommendation is to mark as read-only and unfollow the leader index. Cross-cluster replication on that index will not be possible.

Find additional information in the [upgrade documentation](docs-content://deploy-manage/upgrade/prepare-to-upgrade.md#upgrade-ccr-data-streams).

::::

::::{dropdown} Unexpected deprecation warnings for APM indices during upgrade
:name: known-issue-apm-upgrade-on-ech

Applies to: {{stack}} 9.0.0

**Details**

When upgrading an {{ech}} deployment to {{stack}} 9.0.0, you may see deprecation warnings for APM indices, even if you are not using APM.

If your deployment ever ran on {{stack}} 7.x, these APM indices have been created automatically at that time, even if you didn't use APM. In this case, these indices exist and are empty.

**Action**

To proceed with the upgrade to 9.0.0, you must resolve all deprecation notices for indices beginning with the name `apm-7` by selecting **Mark as read-only** for each of them.

::::

::::{dropdown} Upgrade Assistant - Rollup jobs need to be stopped before rollup indices are reindexed
:name: known-issue-211850

Applies to: {{stack}} 9.0.0

**Details**

Rollup indices, like all indices, created in 7.x or earlier need to be reindexed in preparation for migration to 9.0. However, in addition to the normal reindex process the rollup job also needs to be accounted for. 

**Action**

Stop the rollup job before reindexing begins otherwise there may be a gap in rollup data. You can restart the job can after reindexing is complete.

This needs to be performed manually until addressed in the upgrade assistant code.

View [#211850](https://github.com/elastic/kibana/issues/211850).

::::

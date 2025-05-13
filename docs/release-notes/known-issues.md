---
navigation_title: "Known issues"
---

# Kibana known issues

## 9.0.0

::::{dropdown} Issue with follower indices during upgrade
:name: ua-follower-indices

**Details**

In Upgrade Assistant, follower indices may be identified to be reindexed. However, this is not a valid migration path and will result in an error. Instead, the recommendation is to mark as read-only and unfollow the leader index. Cross-cluster replication on that index will not be possible.

Find additional information in the [upgrade documentation](docs-content://deploy-manage/upgrade/prepare-to-upgrade.md#upgrade-ccr-data-streams).

::::

::::{dropdown} Unexpected deprecation warnings for APM indices during upgrade
:name: known-issue-apm-upgrade-on-ech

**Details**

When upgrading an {{ech}} deployment to {{stack}} 9.0.0, you may see deprecation warnings for APM indices, even if you are not using APM.

If your deployment ever ran on {{stack}} 7.x, these APM indices have been created automatically at that time, even if you didn't use APM. In this case, these indices exist and are empty.

**Action**

To proceed with the upgrade to 9.0.0, you must resolve all deprecation notices for indices beginning with the name `apm-7` by selecting **Mark as read-only** for each of them.

::::

::::{dropdown} Upgrade Assistant - Rollup jobs need to be stopped before rollup indices are reindexed
:name: known-issue-211850

**Details**

Rollup indices, like all indices, created in 7.x or earlier need to be reindexed in preparation for migration to 9.0. However, in addition to the normal reindex process the rollup job also needs to be accounted for. 

**Action**

Stop the rollup job before reindexing begins otherwise there may be a gap in rollup data. You can restart the job can after reindexing is complete.

This needs to be performed manually until addressed in the upgrade assistant code.

View [#211850](https://github.com/elastic/kibana/issues/211850).

::::

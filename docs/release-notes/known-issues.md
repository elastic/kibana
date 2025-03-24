---
navigation_title: "Known issues"
---

# Kibana known issues

## 9.0.0

::::{dropdown} Upgrade Assistant - Rollup jobs need to be stopped before rollup indices are reindexed.
:name: known-issue-211850

**Details**

Rollup indices, like all indices, created in 7.x or earlier need to be reindexed in preparation for migration to 9.0. However, in addition to the normal reindex process the rollup job also needs to be accounted for. 

**Action**

Stop the rollup job before reindexing begins otherwise there may be a gap in rollup data. You can restart the job can after reindexing is complete.

This needs to be performed manually until addressed in the upgrade assistant code.

View [#211850](https://github.com/elastic/kibana/issues/211850).

::::

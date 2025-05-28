---
navigation_title: "Known issues"
---

# Kibana known issues

## 9.0.0

::::{dropdown} Observability AI assistant Knowledge Base entries with empty text can lead to Kibana OOM or restarts
:name:known-issue-220339

**Details** 

The semantic text migration can cause excessive traffic to a cluster and might eventually cause the Kibana instance to crash due to OOM, together with increase of requests to Elasticsearch & ML nodes.

The problem can occur when there is one or more empty text Knowledge Base documents.

The migration script does not handle this scenario and will indefinitely update the same document.

Because the document update involves semantic_text an ML node is kept warm further increasing the costs.

The issue involves semantic_text field type (and thus the semantic_text migration which is causing this issue), introduced in the knowledge base feature in 8.17.

**Workaround** 

1. Pause the Kibana instance if possible. If not possible, skip this step.
2. Run a dry run query to identify if you have empty Knowledge Base documents. If you have at least 1 hit, you can be affected by the problem.

    ```sh
    GET .kibana-observability-ai-assistant-kb/_search
    {
      "query": {
        "bool": {
          "must": [{ "exists": { "field": "text" }}],
          "must_not": [ { "wildcard": { "text": "*" } }
          ]
        }
      }
    }
    ```

3. Execute the deletion. For extra safety, you might want to trigger a snapshot before executing it.

    ```sh
    POST .kibana-observability-ai-assistant-kb/_delete_by_query
    {
      "query": {
        "bool": {
          "must": [{ "exists": { "field": "text" }}],
          "must_not": [ { "wildcard": { "text": "*" } }
          ]
        }
      }
    }
    ```

For more information, check:

- [#220339](https://github.com/elastic/kibana/issues/220339)
- [#220342](https://github.com/elastic/kibana/issues/220342)

::::

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

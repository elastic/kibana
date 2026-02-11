---
navigation_title: Migrations
---

# Saved Object migrations [saved-objects-migrations]

This page describes how changes to **Saved Object type** schemas and mappings are rolled out, depending on the deployment architecture.

Model versions decouple Saved Object versioning from the stack version and support both traditional upgrades (with downtime) and zero-downtime Serverless upgrades. The legacy migration API was tied to stack versions and did not meet backward-compatibility and zero-downtime requirements for Serverless, so it has been deprecated in favor of `modelVersions`.

![multiple migration per stack version schema](../images/model_versions.png)

## Classic stack upgrades

**Classic stack** includes self-managed Kibana and [Elastic Cloud Hosted (ECH)](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/cloud-hosted).

On these deployments, upgrades are typically done **with downtime**:

1. All nodes running the previous Kibana version are shut down.
2. The new version is deployed.
3. At any given time, only one Kibana version is running.

Because there is no cohabitation of old and new versions, there is no risk of the new version applying migrations that change document shape in a way the old version cannot read. Migrations run once during the upgrade, and rollback is done by redeploying the previous version and restoring data if needed.

When you change a Saved Object type on the classic stack:

* Add new **model versions** (do not use the deprecated `migrations` property for new changes).
* Ensure mapping changes are **backward compatible** (additive only; no field removal or type changes that require reindexing).
* The upgrade process applies the model version transformations so documents and index mappings match the new version.

Validation (e.g. `node scripts/check_saved_objects`) and the rules in [Validate](validate.md) still apply so that the same type definitions remain safe when used on Serverless or in future rollback scenarios.

## Serverless upgrades

**Serverless** refers to [Elastic Cloud Serverless (ECS)](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/serverless), where Kibana and Elasticsearch are fully managed and upgrades are performed without user-managed downtime.

In Serverless:

* **Zero-downtime upgrades** — The platform upgrades without shutting down the service. Old and new Kibana versions can **cohabit** for a period.
* **Rollback safety** — The platform must be able to roll back to a previous version. After rollback, the previous version may read documents that were already migrated by the new version, so document shape and migration behavior must stay backward compatible.

This leads to strict requirements for Saved Object type changes:

* **Model versions only** — Use `modelVersions` (not the deprecated `migrations`). Each change is described in a structured way (mapping additions, backfills, data removal, schemas).
* **Forward compatibility** — Each model version should define a `forwardCompatibility` schema. When a document’s version is **newer** than the version known to the running Kibana instance, that schema is used to strip unknown fields and return a document shape the old version understands. This is critical for safe rollback.
* **One new model version per release** — A single release must not introduce more than one model version per type, so rollouts and rollbacks are predictable. Multi-step changes (e.g. stop using a field, then remove it) are done across multiple releases.
* **Immutability** — Once a model version is released, it is never changed or removed. Fixes or further changes require a **new** model version.

Validation (including fixtures and the upgrade/rollback/up-again simulation) ensures that type owners do not introduce changes that break rollback. See [Validate: Ensuring safe Saved Objects type changes](validate.md#ensuring-safe-saved-objects-type-changes) and [Validate: Ensuring robust serverless rollbacks](validate.md#ensuring-robust-serverless-rollbacks).

### Limitations and edge cases in Serverless

* **`find` API with `fields` option** — When `fields` is used, returned documents are **not** migrated, because some model version changes cannot be applied to a partial set of attributes. Callers must only request fields that already existed in the **previous** model version; otherwise behavior can be inconsistent during upgrades. Both the previous and next Kibana versions must follow this rule.
* **`bulkUpdate` and large JSON** — `bulkUpdate` updates documents in memory then reindexes them. Updating many objects with large JSON blobs (or large arrays) in some fields can hit memory limits. Avoid using `bulkUpdate` for types that store large arrays or big JSON blobs in attributes.

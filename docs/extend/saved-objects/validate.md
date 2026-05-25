---
navigation_title: Validate type changes
---

# Validate changes in Saved Object types [saved-objects-validate]

This page covers testing model versions, ensuring safe **Saved Object type** definition changes, and troubleshooting validation failures. It applies to type definitions (the code you register), not to validating Saved Object instances at runtime.

## Testing model versions [_testing_model_versions]

Model version definitions are more structured than legacy migration functions. The `@kbn/core-test-helpers-model-versions` package provides utilities to test the behavior of model versions and their transformations.

### Tooling for unit tests [_tooling_for_unit_tests]

#### Model version test migrator [_model_version_test_migrator]

The `createModelVersionTestMigrator` helper creates a test migrator that applies the same transformations the migration algorithm uses during an upgrade.

**Example:**

```ts
import {
  createModelVersionTestMigrator,
  type ModelVersionTestMigrator
} from '@kbn/core-test-helpers-model-versions';

const mySoTypeDefinition = someSoType();

describe('mySoTypeDefinition model version transformations', () => {
  let migrator: ModelVersionTestMigrator;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({ type: mySoTypeDefinition });
  });

  describe('Model version 2', () => {
    it('properly backfill the expected fields when converting from v1 to v2', () => {
      const obj = createSomeSavedObject();

      const migrated = migrator.migrate({
        document: obj,
        fromVersion: 1,
        toVersion: 2,
      });

      expect(migrated.properties).toEqual(expectedV2Properties);
    });

    it('properly removes the expected fields when converting from v2 to v1', () => {
      const obj = createSomeSavedObject();

      const migrated = migrator.migrate({
        document: obj,
        fromVersion: 2,
        toVersion: 1,
      });

      expect(migrated.properties).toEqual(expectedV1Properties);
    });
  });
});
```

### Tooling for integration tests [_tooling_for_integration_tests]

With a real {{es}} cluster you can test Saved Object documents in a production-like way and simulate two {{kib}} instances with different model versions.

#### Model version test bed

Use `createModelVersionTestBed` to set up a full test bed: start/stop {{es}} and run migrations between the versions under test.

**Example:**

```ts
import {
  createModelVersionTestBed,
  type ModelVersionTestKit
} from '@kbn/core-test-helpers-model-versions';

describe('myIntegrationTest', () => {
  const testbed = createModelVersionTestBed();
  let testkit: ModelVersionTestKit;

  beforeAll(async () => {
    await testbed.startES();
  });

  afterAll(async () => {
    await testbed.stopES();
  });

  beforeEach(async () => {
    testkit = await testbed.prepareTestKit({
      savedObjectDefinitions: [{
        definition: mySoTypeDefinition,
        modelVersionBefore: 1,
        modelVersionAfter: 2,
      }]
    })
  });

  afterEach(async () => {
    if(testkit) {
      await testkit.tearDown();
    }
  });

  it('can be used to test model version cohabitation', async () => {
    const repositoryV1 = testkit.repositoryBefore;
    const repositoryV2 = testkit.repositoryAfter;

    await repositoryV1.create(someAttrs, { id });
    const v2docReadFromV1 = await repositoryV2.get('my-type', id);
    expect(v2docReadFromV1.attributes).toEqual(whatIExpect);
  });
});
```

**Limitations:**

The test bed only instantiates the parts of Core needed for the two SO repositories and does not load all plugins:

* No extensions (no security, encryption, or spaces).
* All SO types use the same SO index.

## Ensuring safe Saved Object type changes [ensuring-safe-saved-objects-type-changes]

Saved Object type definitions drive migrations and the shape of the Saved Objects API. Changes to them must meet strict safety criteria to avoid:

* Data corruption.
* Unsupported mapping changes.
* Rollback failures.

Validation runs automatically in CI on `pull_request` and `on-merge`. You can also run it locally.

### Manually running the type check

Run the check from your PR branch:

```shell
# Get your current commit
git log -n 1

# Get the merge-base with main (or your base branch)
git merge-base -a <lastCommitId> main

# Run the script (validates against that merge-base)
node scripts/check_saved_objects --baseline <mergeBase> --fix
```

If you get validation errors, see [Troubleshooting](#troubleshooting) below.

### Saved Object type validation rules

#### Immutability constraints

* **Existing model versions/migrations** — Once defined, they cannot be changed or deleted. This keeps environments that have already upgraded consistent with those that have not.
* **Deleting versions** — You cannot delete model versions; you can only add new ones.

#### Versioning requirements

* **Consecutive versions** — Model versions must be consecutive integers starting at 1. No gaps.
* **One model version per PR** — A single PR cannot add more than one model version for the same type. Multi-step rollouts must ship in separate Serverless releases. The `on-merge` pipeline compares against the current Serverless release.
* **No new legacy migrations** — Do not add new versions via the deprecated `migrations` property.

#### Mapping and schema compatibility

* **Mapping changes need a new version** — Any change to mappings must be reflected in a new model version (e.g. with `mappings_addition`).
* **Backward compatible mappings** — Updates must be done in place without reindexing. {{es}} does not allow breaking changes such as removing fields or changing field types (e.g. integer to text).
* **Mandatory schemas** — New model versions must include both `create` and `forwardCompatibility` schemas.

### Ensuring robust serverless rollbacks [ensuring-robust-serverless-rollbacks]

For Serverless rollback guarantees, the validation script requires **data fixtures** for any updated Saved Object types. These represent the state before and after the upgrade.

The script runs:

1. Simulate Upgrade → Simulate Rollback → Simulate Second Upgrade.
2. At each step it reads documents via the SavedObjectsRepository.
3. It checks that the document shape matches the corresponding fixture.

Providing fixtures and defining mandatory `create` and `forwardCompatibility` schemas for each new model version allows type owners to validate both migration and rollback behavior.

### Using matchers for auto-generated values in fixtures [fixture-matchers]

Some fields in migrated documents — such as IDs generated by `uuidv4` or `uuidv5` — cannot be hardcoded in fixture files because they change with every baseline run. For these cases, a fixture document can use a special `{ "$match": "<type>" }` marker object in place of a literal value:

```json
{
  "tabs": [
    {
      "id": { "$match": "uuid" },
      "label": "Untitled",
      "attributes": { ... }
    }
  ]
}
```

Instead of requiring an exact value, the check asserts that the actual field satisfies the declared type constraint. The supported matchers are:

| Marker | Asserts |
|---|---|
| `{ "$match": "uuid" }` | A RFC 4122 UUID string |
| `{ "$match": "string" }` | Any string |
| `{ "$match": "number" }` | Any number |
| `{ "$match": "boolean" }` | Any boolean |

Matchers compose naturally with the rest of the fixture: you can use them at any depth inside arrays or objects, mixing them freely with exact literal values.

When the check fails and reports a diff, fields covered by a passing matcher are omitted from the diff output (they are silently substituted with the actual value). Fields covered by a failing matcher appear as `<any uuid>`, `<any string>`, etc., so the diff still points directly at the real problem.

## Work-in-progress Saved Object types [saved-objects-wip-types]

If you are building a new Saved Object type whose schema and mappings are still evolving, the standard immutability constraints can slow down early iteration. The WIP types mechanism lets you iterate freely during development and then graduate the type to full constraints when it is production-ready.

There are two approaches depending on how the owning plugin is deployed.

### Scenario A — Plugin disabled by default; type registered unconditionally [saved-objects-wip-types-scenario-a]

Use this when the feature and its plugin are only enabled in dedicated dev or QA environments and are not deployed to production or Serverless by default.

**Workflow:**

1. Open a PR adding the type name to `src/core/packages/saved-objects/server-internal/wip_types.json` (reviewed by `@elastic/kibana-core`). This file is the gate that Core team reviews.

2. Add the type name to `migrations.allowWipTypes` in every `kibana.yml` where the plugin is enabled. Kibana will fail to start if the type is registered but absent from this list:

   ```yaml
   migrations.allowWipTypes:
     - my_new_type
   ```

3. Iterate freely. The CI SO check treats the type as perpetually new on every PR — the same checks that apply when first introducing a type always apply, but history-based immutability constraints (e.g. "existing model versions cannot change") are never enforced.

4. **Graduation**: when the type is stable and production-ready, open a PR removing it from `wip_types.json` and from all `migrations.allowWipTypes` entries. Full immutability constraints apply from that point forward.

### Scenario B — Plugin enabled everywhere; type registered conditionally [saved-objects-wip-types-scenario-b]

Use this when the plugin is always enabled (including in Serverless production), but the SO type should only be registered when a feature flag or configuration option is turned on.

The `no_conditional_saved_object_type_registration` ESLint rule normally forbids conditional registration to avoid migration ON/OFF conflicts. For WIP types, suppress it with an inline comment and a TODO to remove it at graduation:

```typescript
if (config.featureFlags.myFeatureEnabled) {
  // eslint-disable-next-line @kbn/eslint/no_conditional_saved_object_type_registration -- TODO: remove once my_new_type graduates from WIP
  core.savedObjects.registerType(myNewType);
}
```

Because the type is only registered when the flag is on, it is never registered in environments where the flag is off — so the CI SO check never sees it, and no `wip_types.json` entry or `migrations.allowWipTypes` config is needed.

**Graduation**: remove the conditional and the ESLint suppression. The type becomes unconditionally registered and is subject to full SO type constraints from that point forward.

## Troubleshooting

### CI is failing for my PR

When the *Check changes in saved objects* CI step fails, a comment is posted directly on the PR. Each violation is grouped by SO type and shows a **rule ID**, a message, a fix hint, and a link to the relevant docs section:

```
### `<soType>`
- **[rule-id]** Message. _Fix:_ Fix hint. ([docs](link))
```

You can reproduce all findings locally:

```shell
# Get the merge-base with main (or the base branch of your PR)
git merge-base HEAD main

# Run the check — add --fix to auto-generate missing fixture templates
node scripts/check_saved_objects --baseline <mergeBase> --fix
```

Use the rule IDs below to identify the problem and the appropriate fix.

---

#### Existing type rules

##### `existing-type/mutated-migrations` [existing-type-mutated-migrations]

**Problem:** The deprecated `migrations` property has been modified. It must remain unchanged so that old documents can still be imported.

**Fix:** Revert any changes to `<type>.migrations`. If you need to change migration behavior, add a new model version instead.

---

##### `existing-type/mutated-existing-model-version` [existing-type-mutated-model-version]

**Problem:** A structural change was made to an already-defined model version (mappings, changes block, or similar). Existing model versions are immutable once merged.

**Scenario 1:** You are fixing a bug in an existing model version. Once it is released (e.g. in Serverless), other nodes may already be running against it. Add a new model version instead of editing the existing one.

**Scenario 2:** You only added one new version but CI still reports a mutation. Validation uses two baselines: the PR merge-base and the **current Serverless release**. If the Serverless release includes a version that differs from your local copy, the check sees a mutation. Rebase onto the latest `main` to pick up any updates.

**Fix:** Revert the structural change and add a new model version to capture the update.

---

##### `existing-type/schema-breaking-changes` [existing-type-schema-breaking-changes]

**Problem:** A breaking schema change was detected in an existing model version — for example, a field was removed, its type changed, or an optional field was made required. These changes would break documents already stored against that version.

**Fix:** Revert the breaking schema change. If the update is necessary, introduce it in a new model version.

---

##### `existing-type/schema-undiffable-legacy-hash` [existing-type-schema-undiffable]

**Problem:** A schema-only change was detected in an existing model version, but the baseline snapshot stores the schema as a legacy SHA-256 hash rather than a structured object. Detailed diffing is not possible against the old format.

**Fix:** Rebase onto the latest `main` to obtain a baseline snapshot with the new format, then re-run the check.

---

##### `existing-type/deleted-model-versions` [existing-type-deleted-model-versions]

**Problem:** One or more model versions were deleted from the type. Your branch may be behind the current Serverless baseline and missing recent versions.

**Fix:** Restore the missing model version(s). Existing model versions cannot be deleted.

---

##### `existing-type/too-many-new-model-versions` [existing-type-too-many-model-versions]

**Problem:** A single PR is adding more than one model version for the same type. Only one new model version per type per PR is allowed to support safe, incremental Serverless rollouts.

**Scenario 1:** You have several unrelated changes that each require a model version. Ship them in separate PRs.

**Scenario 2:** You only added one version but CI still reports two. Validation uses two baselines: your PR merge-base and the **current Serverless release**. If the Serverless release was recently rolled back, the "current release" baseline may make your branch look like it defines two new versions. Wait for the release state to normalize, or contact the {{kib}} Core team.

**Fix:** Split the change so that each PR adds exactly one new model version.

---

##### `existing-type/mappings-changed-without-new-model-version` [existing-type-mappings-without-model-version]

**Problem:** The type's mappings were modified without adding a new model version. Mapping changes must be declared in a model version so the migration algorithm can keep the index up to date.

**Fix:** Add a new model version with a `mappings_addition` change block and the corresponding `schemas.forwardCompatibility` (and `schemas.create` if applicable).

---

##### `existing-type/new-mappings-not-in-model-version` [existing-type-new-mappings-not-in-model-version]

**Problem:** The new model version's `mappings_addition` change does not include all of the newly introduced mapping fields.

**Fix:** Add the missing fields to the `mappings_addition` change in the new model version.

---

##### `existing-type/removed-mapped-properties` [existing-type-removed-mapped-properties]

**Problem:** One or more mapped properties were removed from the type. {{es}} does not allow removing fields from a live index without a full reindex.

**Fix:** Restore the removed mapped properties. To stop writing to a field, leave it in the mappings but stop populating it from application code.

---

##### `existing-type/virtual-version-downgrade` [existing-type-virtual-version-downgrade]

**Problem:** The type's computed virtual version is lower than it was in the baseline. This is usually caused by removing a model version.

**Fix:** Restore the missing model version(s) so the virtual version is at least as high as the baseline.

---

##### `existing-type/keyword-missing-ignore-above` [existing-type-keyword-ignore-above]

**Problem:** A newly introduced `keyword` or `flattened` mapping field is missing an `ignore_above` limit. Without it, {{es}} silently drops strings that exceed the default limit.

**Fix:** Add `ignore_above: 1024` (or another appropriate limit) to each affected field.

---

##### `existing-type/invalid-name-title-field-type` [existing-type-invalid-name-title]

**Problem:** A `name` or `title` field in the type's mappings uses a type other than `text`. The Saved Objects Search API relies on these fields being `text` for full-text search.

**Fix:** Change the field mapping type to `text`. If the field already exists in production, this requires a full reindex.

---

#### New type rules

##### `new-type/missing-initial-model-version` [new-type-missing-initial-model-version]

**Problem:** A brand-new SO type does not define model version `1`.

**Fix:** Add a `modelVersions` entry with key `1` containing `schemas.create` and `schemas.forwardCompatibility`.

---

##### `new-type/legacy-migrations` [new-type-legacy-migrations]

**Problem:** A new SO type is using the deprecated `migrations` property.

**Fix:** Remove `migrations` and replace it with `modelVersions`, starting at version `1`.

---

##### `new-type/keyword-missing-ignore-above` [new-type-keyword-ignore-above]

Same cause and fix as [`existing-type/keyword-missing-ignore-above`](#existing-type-keyword-ignore-above), but for a brand-new type.

---

##### `new-type/invalid-name-title-field-type` [new-type-invalid-name-title]

Same cause and fix as [`existing-type/invalid-name-title-field-type`](#existing-type-invalid-name-title), but for a brand-new type.

---

#### Model version rules

These rules apply to both new and existing types.

##### `model-version/initial-must-be-schema-only` [model-version-initial-schema-only]

**Problem:** The initial model version (`1`) of a new type defines a `changes` block (e.g. `mappings_addition`). For backward-compatibility reasons, the first model version can only contain `schemas`.

**Fix:** Remove `changes` from model version `1` and keep only `schemas`.

---

##### `model-version/numbers-must-be-consecutive` [model-version-consecutive]

**Problem:** Model version keys must be consecutive positive integers starting at `1`. Either a key is not a number or there is a gap in the sequence.

**Fix:** Rename version keys to form an unbroken sequence: `1`, `2`, `3`, …

---

##### `model-version/missing-schemas` [model-version-missing-schemas]

**Problem:** A new model version is missing the `schemas` definition entirely.

**Fix:** Add a `schemas` object with both `create` and `forwardCompatibility` sub-schemas.

---

##### `model-version/missing-forward-compatibility` [model-version-missing-fwd-compat]

**Problem:** A new model version is missing `schemas.forwardCompatibility`.

**Fix:** Add `schemas.forwardCompatibility` to the model version.

---

##### `model-version/missing-create-schema` [model-version-missing-create]

**Problem:** A new model version is missing `schemas.create`.

**Fix:** Add `schemas.create` to the model version.

---

##### `model-version/mappings-not-in-schema` [model-version-mappings-not-in-schema]

**Problem:** The type has mapping fields that are not present in the latest model version's `create` schema. All mapped fields must be covered by the schema.

**Fix:** Add the missing fields to the `create` schema of the latest model version.

---

##### `model-version/mapping-index-false` [model-version-mapping-index-false]

**Problem:** A new mapping field uses `index: false`. This option cannot be reverted without a full reindex, making it a risky long-term commitment.

**Fix:** Use `dynamic: false` on the parent object to prevent {{es}} from indexing unknown sub-fields, or omit the mapping entirely for fields that do not need to be searchable.

---

##### `model-version/mapping-enabled-false` [model-version-mapping-enabled-false]

**Problem:** A new mapping field uses `enabled: false`. Like `index: false`, this cannot be undone without a reindex.

**Fix:** Use `dynamic: false` on the parent object instead, or omit the mapping entirely.

---

##### `model-version/fixture-missing` [model-version-fixture-missing]

**Problem:** The type has a new model version but the required rollback test fixtures are missing. Fixtures are needed to validate upgrade and rollback behavior during CI.

**Fix:** Run `node scripts/check_saved_objects --baseline <mergeBase> --fix` to generate the fixture template, then populate it with representative sample documents. See [Ensuring robust serverless rollbacks](#ensuring-robust-serverless-rollbacks).

---

##### `model-version/fixture-invalid` [model-version-fixture-invalid]

**Problem:** A fixture file exists but its contents are malformed. The file must be a JSON object with one key per version (`<previousVersion>` and `<newVersion>`), each holding a non-empty array of documents.

**Fix:** Correct the fixture file so it matches the expected format, or delete it and re-run with `--fix` to regenerate a valid template.

---

#### Document rules

##### `documents/fixture-mismatch` [documents-fixture-mismatch]

**Problem:** During the automated rollback test, a document read from {{es}} did not match any entry in the fixture. Either the migration produced an unexpected document shape, or the fixture is out of date.

**Fix:** Update the fixture to match the actual document structure produced by the migration, or fix the migration transformation to produce the expected output.

---

#### Removed type rules

##### `removed-type/registry-needs-update` [removed-type-registry-needs-update]

**Problem:** A Saved Object type is no longer registered but `removed_types.json` has not been updated to record the removal.

**Fix:** Run `node scripts/check_saved_objects --baseline <mergeBase> --fix`, then commit the updated `removed_types.json`. See [Delete](delete.md) for how to get the merge-base.

---

##### `removed-type/name-reused` [removed-type-name-reused]

**Problem:** The type name was previously removed and recorded in `removed_types.json`. Type names in that file are permanently reserved and cannot be reused.

**Fix:** Choose a different name for the new type.

---

### Kibana fails to start: WIP type not in `allowWipTypes`

```shell
Kibana cannot start because the following WIP saved object types are registered but not listed in 'migrations.allowWipTypes': [<soType>].
```

**Problem:** A type listed in `wip_types.json` is registered by a plugin but has not been explicitly allowed in the Kibana configuration.

**Fix:** Add the type name to `migrations.allowWipTypes` in `kibana.yml` for every environment where the plugin is enabled:

```yaml
migrations.allowWipTypes:
  - <soType>
```

If you did not intend to register a WIP type, check whether the plugin should be disabled in this environment. See [Scenario A](./validate.md#saved-objects-wip-types-scenario-a) for the full workflow.

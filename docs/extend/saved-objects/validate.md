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

## Troubleshooting

### CI is failing for my PR

CI validates Saved Object type definitions. When you add or change a type, the *Check changes in saved objects* step may fail. Use the errors below to identify the cause.

```shell
❌ Modifications have been detected in the '<soType>.migrations'. This property is deprected and no modifications are allowed.
```

**Problem:** The deprecated `migrations` property cannot be modified. Existing `migrations` must remain for importing old documents.
**Solution:** Do not change `migrations`. If you did not change it, rebase and ensure your branch is up to date.

```shell
❌ Some modelVersions have been updated for SO type '<soType>' after they were defined: 5.
```

**Problem:** Existing `modelVersions` cannot be mutated; that would cause inconsistencies between deployments.

**Scenario 1:** You are adding a new model version, but someone else already added one that was released in Serverless (the comparison baseline).
**Scenario 2:** You are fixing a bug in an existing version. Once a version is merged and released (e.g. in Serverless), it may already be in use. You generally need to add a new model version instead of editing the existing one.

```shell
❌ Some model versions have been deleted for SO type '<soType>'.
```

**Problem:** Model versions cannot be deleted. Your branch may be behind the current Serverless release and missing recent versions.
**Solution:** Rebase and pull the latest SO type definitions.

```shell
❌ Invalid model version 'five' for SO type '<soType>'. Model versions must be consecutive integer numbers starting at 1.
❌ The '<soType>' SO type is missing model version '4'. Model versions defined: 1,2,3,5.
```

**Problem:** Version keys must be consecutive numeric strings (e.g. '1', '2', '3').
**Solution:** Use consecutive integers starting at 1 with no gaps.

```shell
❌ The '<soType>' SO type has changes in the mappings, but is missing a modelVersion that defines these changes.
```

**Problem:** Mapping changes must be declared in a model version so the migration logic can update the SO index.
**Solution:** Add a new model version that includes a `mappings_addition` change and the corresponding `schemas.forwardCompatibility` (and `create` if applicable).

```shell
❌ The SO type '<soType>' is defining two (or more) new model versions.
```

**Problem:** Only one new model version per type per PR is allowed to support safe, incremental rollouts.

**Scenario 1:** You have several unrelated changes. If they do not require a multi-step rollout, combine them into a single model version.
**Scenario 2:** You only added one new version but CI still fails. Validation uses two baselines: your PR merge-base (usually stable) and the **current Serverless release**. If Serverless was rolled back, the “current release” baseline may make your PR look like it defines multiple new versions. Wait for the release state to normalize, or contact the {{kib}} Core team.

```shell
❌ The following SO types are no longer registered: '<soType>'. Please run with --fix to update 'removed_types.json'.
```

**Problem:** A Saved Object type was removed but `removed_types.json` was not updated.
**Solution:** Run `node scripts/check_saved_objects --baseline <mergeBase> --fix`, then commit the updated `removed_types.json`. See [Delete](delete.md) for how to get the merge-base.

```shell
❌ Cannot re-register previously removed type(s): <soType>. Please use a different name.
```

**Problem:** The type name was used before and then removed. Type names in `removed_types.json` cannot be reused.
**Solution:** Choose a different type name. Names in `packages/kbn-check-saved-objects-cli/removed_types.json` are permanently reserved.

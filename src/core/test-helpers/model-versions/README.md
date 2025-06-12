# @kbn/core-test-helpers-model-versions

Package exposing utilities for model version testing:
- unit testing
- integration testing

## Unit testing

### Model version test migrator

The `createModelVersionTestMigrator` helper allows to create a test migrator that
can be used to test model version changes between versions.

```ts
const mySoType = someSoType();
const migrator = createModelVersionTestMigrator({ type: mySoType });

const obj = createSomeSavedObject();

const migrated = migrator.migrate({
   document: obj,
   fromVersion: 1,
   toVersion: 2,
});

expect(migrated.properties).toEqual(myExpectedProperties);
```

Please refer to the code documentation for more detailed examples.

## Integration testing

### Model version test bed

This package exposes a `createModelVersionTestBed` utility which allow simulating
a testbed environment where we're in the cohabitation period between two versions, to test the interactions
between two model versions of a set of SO types.

Please refer to the code documentation for more detailed examples.

*Limitations:*

Because the test bed is only creating the parts of Core required to create the two SO 
repositories, and because we're not loading all plugins (for proper isolation), the integration
test bed has some limitations:

- no extensions are enabled
  - no security
  - no encryption
  - no spaces
- all SO types will be using the same SO index
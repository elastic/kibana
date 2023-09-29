# @kbn/core-test-helpers-model-versions

Package exposing utilities for model version integration testing.

This package exposes a `createModelVersionTestBed` utility which allow simulating
a testbed environment where we're in the cohabitation period between two versions, to test the interactions
between two model versions of a set of SO types.

### Limitations:

Because the test bed is only creating the parts of Core required to create the two SO 
repositories, and because we're not loading all plugins (for proper isolation), the integration
test bed has some limitations:

- no extensions are enabled
  - no security
  - no encryption
  - no spaces
- all SO types will be using the same SO index
# Helpers and utilities for @kbn/config-schema

Helpers defined in this package:

- Can be used in other packages and plugins to make it easier to work with `@kbn/config-schema`, such as in tests.
- Are already used in saved object model version tests.

When you add some helper code to this package, please make sure that:

- The code is generic and domain-agnostic (doesn't "know" about any domains such as Security or Observability).
- The code is reusable and there are already a few use cases for it. Try to not generalize prematurely.

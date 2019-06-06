# @kbn/test/types

Shared types used by different parts of the tests

 - **`ftr.d.ts`**: These types are generic types for using the functional test runner. They are here because we plan to move the functional test runner into the `@kbn/test` package at some point and having them here makes them a lot easier to import from all over the place like we do.
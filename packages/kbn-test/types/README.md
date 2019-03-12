# @kbn/test/types

Shared types used by different parts of the tests

 - **`expect.js.d.ts`**: This is a fork of the expect.js types that have been slightly modified to only expose a module type for `import expect from 'expect.js'` statements. The `@types/expect.js` includes types for the `expect` global, which is useful for some uses of the library but conflicts with the jest types we use. Making the type "module only" prevents them from conflicting.
 - **`ftr.d.ts`**: These types are generic types for using the functional test runner. They are here because we plan to move the functional test runner into the `@kbn/test` package at some point and having them here makes them a lot easier to import from all over the place like we do.
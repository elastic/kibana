## ES UI shared modules

This plugin contains reusable code in the form of self-contained modules (or libraries). Each of these modules exports a set of functionality relevant to the domain of the module.

**Please note**: Modules in ES UI shared are intended for use by the ES UI Management Team (elastic/es-ui@) only. Please reach out to us if there is something you would like to contribute or use in these modules.

## Files and folders overview

- `./public` | `./server`. Folders for grouping server or public code according to the Kibana plugin pattern.
- `./__packages_do_not_import__` is where actual functionality is kept. This enables modules more control over what functionality is directly exported and prevents parts of modules to be depended on externally in unintended ways.
- `./public/index.ts` | `./server/index.ts` These files export modules (simple JavaScript objects). For example, `Monaco` is the name of a module. In this way, modules namespace all of their exports and do not have to be concerned about name collisions from other modules.

## Conventions for adding code

When adding new functionality, look at the folders in `./__packages_do_not_import__` and consider whether your functionality falls into any of those modules.

If it does not, you should create a module and expose it to public or server code (or both) following the conventions described above.

### Example

If I wanted to add functionality for calculating a Fibonacci sequence browser-side one would do the following:

1. Create a folder `./__packages_do_not_import__/math`. The name of the folder should be a snake_case version of the module name. In this case `Math` -> `math`. Another case, `IndexManagement` -> `index_management`.
2. Write your function in `./__packages_do_not_import__/math/calculate_fibonacci.ts`, adding any relevant tests in the same folder.
3. Export functionality intended _for consumers_ from `./__packages_do_not_import__/math/index.ts`.
4. Create a folder `./public/math`.
5. Export all functionality from `./__packages_do_not_import__/math` in `./public/math/index.ts`.
6. In `./public/index.ts` import `./public/math` using `import * as Math from './public/math;`. The name (`Math`) given here is really important and will be what consumers depend on.
7. Add the `Math` module to the list of exported modules in `./public/index.ts`, e.g. `export { <...other modules>, Math }`
8. Use `Math` in your public side code elsewhere!

This example assumes no other appropriate home for such a function exists.

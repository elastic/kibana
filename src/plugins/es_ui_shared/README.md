## ES UI shared modules

This plugin contains reusable code in the form of self-contained modules
(or libraries). Each of these modules exports a set of functionality
relevant to the domain of the module.

## Files and folders overview

- `./public` | `./server`. Folders for grouping server or public code following
the Kibana plugin pattern.
- `./__packages_do_not_import__` is where actual functionality is kept. This enables
modules more control over what functionality is directly exported and prevents parts
of modules to be depended on externally in unintended ways.
- `./public/index.ts` | `./server/index.ts` These files export modules (simple JavaScript objects). For example, `Monaco` is the name of a module. In this way, modules
namespace all of their exports and do not have to be concerned about
name collisions from other modules.


## Conventions for adding code

When adding new functionality, look at the folders in `./__packages_do_not_import__` and consider whether your functionality falls into any of those
modules.

If it does not, you should create a module and expose it
to public or server code following the conventions described above.

### Example

If I wanted to add functionality for calculating a Fibonacci sequence browser-side one would find or create a `Math` module by:

1. Creating a folder `./__packages_do_not_import__/math`.
2. Write your function (with accompanying tests) in `./__packages_do_not_import__/math`.
3. Export functionality intended _for consumers_ from `./__packages_do_not_import__/math/index.ts`.
4. Create a folder `./public/math`.
5. Export all functionality from `./__packages_do_not_import__/math` in `./public/math/index.ts`.
6. In `./public/index.ts` import `./public/math` using `import * as Math from './public/math;`. The name given here is really important and will be what consumers depend on.
7. Export `Math` from `./public/index.ts`, `export { ..., Math }`
8. Use `Math` in your public side code elsewhere!

This example assumes no other appropriate home for such a function exists.

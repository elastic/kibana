## Parsing and using the flag

`cypress-cloud` accepts CLI flags and also parameters for the exported `run` function.
Those are separate from Cypress flags, but similar enough to be easy to use for users that are used to using Cypress.

When we accept the flags from a user, we parse them (in lib/cli) and keeping them as an object. When needed, we either serialize them into a CLI-compatible (for `cp.spawn`) form, or pass them down as options object to `cypress.run`. It is important to remove all the flags that can invoke cloud functionality, but also keep all other params that define cypress behaviour.

We use `getCypressRunAPIParams` to remove all the irrelevant flags when running cypress

CLI
⇣
Run
⇣

- config resolver (stripped, serialized)
- cypress.run (stripped)

# kibana-utils

Deprecated compatibility plugin. Code in the Kibana repository should use the runtime-specific
`@kbn/kibana-utils-*` packages instead.

- `@kbn/kibana-utils-common`
- `@kbn/kibana-utils-browser`
- `@kbn/kibana-utils-server`

New code should import from the package matching its runtime.

Independently bundled external plugins should continue to import identity-sensitive exports, such
as `SavedObjectNotFound` and other error classes used with `instanceof`, from this compatibility
plugin. Importing those exports from a package can bundle a separate constructor and cause
cross-bundle identity checks to fail.

- [State containers](./docs/state_containers).
- [State syncing utilities](./docs/state_sync).

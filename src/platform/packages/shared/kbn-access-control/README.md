# @kbn/access-control

Pure model of Kibana's platform object-level security (OLS). It has no runtime dependencies, so the
Saved Objects repository, the Security plugin, and consumers such as Actions share one set of rules.

- `normalizeAclSource` reads the stored `acl` field the way Elasticsearch indexes it.
- `evaluateAcl` decides what a caller can do with one object.
- `buildAclReadFilter` builds the query clause that keeps the same objects for searches.
- `prepareInitialAcl` and `prepareAclChange` validate access changes and build the ACL to store.

Point decisions and read filters must agree. `ACL_SHAPE_FIXTURES` is the hand-written contract both
must meet: the unit tests assert the evaluator against it, and the Saved Objects integration tests
assert the read filter against it with a real Elasticsearch.

Security owns principal resolution, recovery, feature privileges, and audit. This package only
decides from the values it is given.

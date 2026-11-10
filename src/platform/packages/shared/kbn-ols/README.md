# @kbn/ols

The shared model of Kibana object-level security (OLS): who can do what with a single object, on top of the feature
privileges and spaces that already decide access to the whole feature. The package has no runtime dependencies, so
Core, the Security plugin, and plugins that adopt OLS can all build on the same definitions.

For now, it holds the vocabulary and the rules every later piece relies on: access levels, principals, per-type
access policies, and the shapes an ACL takes when it is written and when it is read back. It also reads the ACL from
a stored document, and builds the search filter that applies the same rules to a list. Its tests also get a
hand-written table of stored ACL shapes with the access each one must grant.

## Access levels

Access is cumulative. Each level includes every level below it:

```text
none < view < use < edit < manage
```

- **General access** is what everyone who can reach the object (has the feature privileges in its space) can do. It
  can never be `manage`.
- **Entries** grant a level to a named principal: a user, identified by their profile UID, or a service account,
  identified by its `namespace/service` ID. An entry can never grant `none`.
- **Ownership** is a separate relationship, stored as `owner`, not a level. Every ACL Kibana writes has an
  owner.

`isAclLevel`, `isGeneralAccessLevel`, and `isEntryLevel` check values read from storage, and `compareLevels`,
`maxLevel`, and `lowestAllowed` compare and pick levels. `lowestAllowed` matters for damaged or hand-edited data:
when a stored value holds several levels, only the most restrictive one that the type allows counts, and values the
type doesn't know are ignored.

## Access policies

Every type that adopts OLS declares one access policy. It says which levels general access can take
(`generalAccessLevels`), which one new objects and objects without an ACL get (`defaultGeneralAccessLevel`), which
levels entries can grant (`entryLevels`), and which level each operation needs. The default is required, because it
decides access to every existing object when a type adopts OLS. For example, a type
whose objects everyone can edit by default (`edit`), whose owners can let others only use them (`use`) or nothing at
all (`none`), and whose entries grant `use`:

```ts
const policy: AccessPolicy = {
  generalAccessLevels: ['none', 'use', 'edit'],
  defaultGeneralAccessLevel: 'edit',
  entryLevels: ['use'],
  operations: {
    view: { level: 'view', privileges: {} },
    use: {
      level: 'use',
      privileges: { api: ['my_feature_run'] },
    },
    edit: { level: 'edit', privileges: {} },
    delete: { level: 'edit', privileges: {} },
  },
};
```

An operation's `privileges` are feature privileges the caller must also hold, on top of the level. The list is an
AND: the caller needs every privilege in it, so adding one can only narrow who can perform the operation. ACLs never
grant more than the caller's feature privileges allow.

`validateAccessPolicy` rejects a policy that can't be enforced consistently, for example one that:

- allows `manage` as general access, or defaults to a value it doesn't allow.
- lets entries grant `none`, or no level at all.
- misses `view`, `edit`, or `delete`, or gives `view` a level other than `view`.
- defines `manage_access` or `transfer`, which belong to the platform (`isReservedOperation`).

## ACL shapes

An ACL lives in the object's `acl` field. Kibana always writes it in one shape, `Acl`:

```json
{
  "version": 1,
  "owner": { "type": "user", "id": "u_owner" },
  "general_access": "none",
  "entries": [
    { "type": "user", "id": "u_grantee", "access": "use", "added_at": "2026-10-21T00:00:00Z" }
  ]
}
```

Stored data can still drift from that shape. Elasticsearch lets any field hold several values, so a manual edit or a
direct write to the index can leave, for example, `"general_access": ["edit", "none"]`, and a search matches the
document when any of those values matches. So reads use a different type, `StoredAcl`, which keeps every value of
every field. Reading a single object then works from the same data a search does, and the access rules decide what
several values mean (for levels, the lowest allowed one wins), so opening an object and finding it in a list always
agree. Fields that don't affect access, such as `added_at`, are arrays too, only so that every field is read the same
way.

An ACL is in one of three states (`AclState`):

- `absent`: no ACL field holds a value (only `null`, `[]`, or `{}`). The type's default general access applies.
- `valid`: the ACL has a supported version, an owner, and general access, as every ACL Kibana writes does, and it
  is enforced.
- `invalid`: the ACL is damaged, for example it has an unsupported version or no owner, and grants no ordinary
  access at all.

## Reading a stored ACL

These are the rules for reading a stored ACL, and the fixture table follows them. Each rule has to hold both when
Kibana reads a single object and when it filters a search, so a list never disagrees with opening the object.

The version, the owner, and general access decide who controls the object, and Kibana always writes all three. A
stored ACL with anything else in them didn't come from Kibana, so it counts as damaged. Entries only ever add access,
so an unreadable entry just grants nothing.

- **State.** An ACL where no field holds a value is `absent`. An empty string is a value. Otherwise, the ACL is
  `valid` when all of these hold, and `invalid` when any doesn't:
  - It has at least one version value, and every one is `1`.
  - The owner has exactly one known kind, once unknown kinds are ignored, and at least one ID.
  - General access has at least one value that general access can take (`isGeneralAccessLevel`): `none`, `view`,
    `use`, or `edit`.

  These checks don't depend on the type's policy, so a type that later stops allowing a general access value
  doesn't make its stored ACLs invalid. An invalid ACL grants nothing at all, not even ownership. A recovery
  administrator repairs it by transferring ownership, which writes a complete ACL.
- **Values are text.** Numbers and booleans are read as text, the way Elasticsearch indexes them into `keyword`
  fields: an owner ID stored as `1` matches a principal whose ID is `"1"`, and a general access of `true` is an
  unknown value.
- **General access.** Values the type doesn't allow are ignored, and the lowest allowed one applies. When the type
  allows none of them, general access is `none`: the object becomes private, and the owner and entries still apply.
- **Owner IDs.** Every stored owner ID counts, so an owner with several IDs makes each of them an owner. This is the
  one place where several values don't fall back to the most restrictive reading: a search matches a document when
  any stored ID matches, and a search filter can't cheaply tell one stored ID from several, so reading a single
  object has to agree with it. Kibana never writes more than one owner ID, so only a direct write to the index can
  produce such an ACL.
- **Entries.** Unknown kinds and levels the type doesn't allow for entries are ignored. An entry with exactly one
  known kind and at least one allowed level grants the lowest of those levels to each of its IDs. Any other entry
  grants nothing, and the rest of the ACL still applies. When several entries grant to the same principal, the
  highest of their grants applies.
- **Kinds match exactly.** A principal only matches its own kind, so a service account never matches a user whose
  ID has the same text.
- **Entries stay separate.** A kind, an ID, and a level from different entries never combine into a grant.
- **One ACL, however it is spelled.** Dotted keys, such as `"acl.owner.id"` at the document root or `"owner.id"`
  inside `acl`, and an array of `acl` objects all add their values to the same ACL, the way Elasticsearch indexes
  them. A dotted `"acl.entries"` key adds its own entries.

## Reading the ACL from a document

`normalizeAclSource` reads the ACL of one object from its whole document source, and returns a `StoredAcl` with the
values that Elasticsearch indexes for it. It returns `undefined` when no ACL field holds a value, which is the
`absent` state. It follows these rules:

- It reads every root key of the source, not only `acl`, because Elasticsearch also indexes dotted keys such as
  `"acl.owner.id"` at the root.
- It merges the values of one field from nested objects, dotted keys at any depth, and arrays. It drops `null`.
- Each object under `acl.entries` is one entry, because Elasticsearch stores each one as a separate nested
  document. A dotted key under `acl.entries`, such as `"entries.id"` inside `acl`, forms an entry of its own. So the
  sibling keys `"entries.type"`, `"entries.id"`, and `"entries.access"` make three entries, and each one grants
  nothing.
- It ignores keys that the `acl` mapping does not define, such as `foo` in `"acl": { "foo": "bar" }`, because
  Elasticsearch does not index them. An ACL with only such keys is absent.
- Every field of an entry counts, `added_at` included. So an entry with only `added_at` makes the ACL present. That
  ACL is invalid, because it has no version and no owner.
- Numbers and booleans become text, the way a `keyword` field indexes them. The only exception is `version`, which
  keeps its stored values.

Numbers have one limit. Elasticsearch indexes a number in a `keyword` field with the text that the document used, so
`1.0` becomes `"1.0"`, and `1e2` becomes `"1e2"`. Kibana gets the source as parsed JSON, where both are numbers, so
the reader returns `"1"` and `"100"`. A number in its shortest form, such as `1` or `42`, reads the same both ways.
User profile UIDs start with `u_`, service account IDs contain `/`, and no level or principal kind is a number. So
this difference cannot change who gets access.

`toAclSource` does the reverse, for a rewrite of the whole document. It turns a `StoredAcl` back into a value for the
`acl` field that indexes to the same values, and that has no dotted keys. The caller also removes the dotted `acl.*`
keys from the document root, so that they cannot keep a grant that a later change removed.

## Filtering a search

`buildAclReadFilter` builds the query clause that keeps the objects of one type that a caller can access at a level,
usually `view`. A search adds the clause to its filters. The clause applies the rules in
[Reading a stored ACL](#reading-a-stored-acl), so a list never shows an object that opening it would deny:

- An absent ACL matches only when the type's default general access reaches the level.
- A valid ACL matches when its general access reaches the level, when the caller is the owner, or when an entry
  names the caller with a level that reaches it. The owner matches at every level, because the owner acts at
  `manage`.
- An invalid ACL never matches. The checks for a valid ACL do not depend on the type's policy.
- An entry matches only when its own kind, ID, and level match. The clause on `acl.entries` is a `nested` query, so
  values from different entries never combine.
- A caller without a principal matches only through general access or an absent ACL.

The filter takes two lists of spaces. In `recoverySpaces`, the caller has recovery authority (the right to repair any
object of the type), and sees every object, whatever its ACL. In `ordinarySpaces`, only the rules above apply. `['*']`
stands for every space that the search already covers. The two lists work together in one filter: an object in a
recovery space always matches, an object in an ordinary space matches only under the rules above, and an object in
neither list never matches. A space in both lists works as a recovery space. An object shared to all spaces is
stored with `"namespaces": ["*"]`, and it counts as being in every listed space, the same way the Saved Objects
repository treats it. When both lists are empty, the filter matches nothing.

The filter contains `nested` queries on `acl.entries` in most cases: the absent-ACL clause uses one whenever the
type's default general access reaches the level, and the entry clause uses one when the caller has a principal and
the type allows an entry level that reaches it. Elasticsearch rejects a search that contains a `nested` query when
`search.allow_expensive_queries` is `false`, so those searches fail. A filter without one, such as a filter for
recovery spaces only, still works. A search that must always fail when the setting is off therefore checks the
setting itself, instead of relying on the shape of the filter.

## The fixture table

`src/__fixtures__` holds test-only data. The package build drops that folder, and the entry point doesn't export it.

`ACL_SHAPE_FIXTURES` lists stored shapes, from an empty object to dotted keys and owners with two principal kinds.
Each fixture says whether Elasticsearch accepts the document, which state the ACL is in, and the highest level each
test principal (`FIXTURE_PROBES`) can act at. Levels include every level below them, the owner of a valid ACL acts
at `manage`, and a principal that can't even view the object is left out.

Most fixtures use `FIXTURE_POLICY`, where entries grant only `use`. A few use `FIXTURE_POLICY_ALL_LEVELS`, where
`view`, `use`, and `edit` all differ, to cover the rules that need several levels: duplicate entries, and the lowest
of several allowed entry levels.

The expectations are written by hand, and that's the point: they are the contract. Both the code that evaluates one
object and the query that filters a search must produce exactly these answers, so a list can never show an object
that opening it would deny. When you add a shape, decide its expected access from the rules above, not from what any
implementation returns.

The tests of the reader and the filter use the table:

- The reader tests expect an ACL for every fixture whose state is not `absent`, and expect `toAclSource` to write
  each one back unchanged.
- The filter tests index each fixture in memory, with the values that the reader returns. Then they run the filter
  for every probe at `view`, `use`, `edit`, and `manage`, and expect exactly the levels up to the one in the
  fixture's `access`. They also expect every fixture to match in a recovery space.

Four shapes are in the reader and filter tests, and not in the table, because they test how the reader reads the
source: a key that the mapping does not define, an entry with only `added_at`, an empty string, and sibling dotted
entry keys.

# @kbn/ols

The shared model of Kibana object-level security (OLS): who can do what with a single object, on top of the feature
privileges and spaces that already decide access to the whole feature. The package has no runtime dependencies, so
Core, the Security plugin, and plugins that adopt OLS can all build on the same definitions.

For now, it holds the vocabulary and the rules every later piece relies on: access levels, principals, per-type
access policies, and the shapes an ACL takes when it is written and when it is read back. It also reads the ACL from
a stored document, decides what a caller can do with one object, builds the search filter that applies the same rules
to a list, and checks the ACL changes a caller asks for. Its tests also get a hand-written table of stored ACL shapes
with the access each one must grant.

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
    execute: {
      level: 'use',
      privileges: { api: ['my_feature_run'] },
    },
    edit: { level: 'edit', privileges: {} },
    delete: { level: 'edit', privileges: {} },
  },
};
```

Operation names belong to the type, and levels belong to OLS. In this example, the type's own `execute` operation
needs the `use` level.

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
  administrator repairs it by transferring ownership, which writes a complete ACL. When the stored owner is a single
  principal, replacing general access and the entries repairs it too.
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
Kibana writes every keyword ACL value as a string, so only a direct write to the index can store such a number. User
profile UIDs start with `u_`, service account IDs contain `/`, and no level or principal kind is a number. So this
difference cannot change who gets access. A later principal kind whose IDs can be plain numbers, such as groups, has
to close this gap.

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

The filter takes two lists of spaces:

- `ordinarySpaces`: the rules above apply.
- `recoverySpaces`: the caller has recovery authority, the right to repair any object of the type. At `view`, the
  caller sees every object in these spaces, whatever its ACL. At any other level, the rules above apply, because
  recovery never lets a caller use, edit, or delete an object.

An object in neither list never matches, and when both lists are empty, the filter matches nothing. A space in both
lists counts as a recovery space. `['*']` stands for every space that the search already covers. An object shared to
all spaces is stored with `"namespaces": ["*"]`, and it counts as being in every listed space, the same way the Saved
Objects repository treats it.

The filter contains `nested` queries on `acl.entries` in most cases: the absent-ACL clause uses one whenever the
type's default general access reaches the level, and the entry clause uses one when the caller has a principal and
the type allows an entry level that reaches it. Elasticsearch rejects a search that contains a `nested` query when
`search.allow_expensive_queries` is `false`, so those searches fail, and Kibana never retries them without the filter.
A filter without a `nested` query, such as a filter for recovery spaces only at `view`, still filters completely, so
its search runs.

## Deciding access to one object

`evaluateAcl` decides what a caller can do with one object. It takes the type's policy, the stored ACL as
`normalizeAclSource` returns it, the caller, and whether the caller has recovery authority. It applies the rules in
[Reading a stored ACL](#reading-a-stored-acl), and `getAclState` returns the state on its own.

- **Level.** Without an ACL, the caller's level is the type's default general access. With a valid ACL, it is the
  highest of general access and every entry that names the caller. With an invalid ACL, it is `none`.
- **Operations.** The caller can perform every operation of the type whose level the caller's level reaches. At
  `manage`, the caller can also manage access (`manage_access`).
- **Ownership.** The owner of a valid ACL can perform every operation of the type, manage access, and transfer
  ownership (`transfer`). Only the owner can transfer ownership. Ownership isn't a level, so it doesn't raise the
  level the decision reports. The owner of an invalid ACL gets nothing.
- **Recovery.** Recovery authority adds viewing, managing access, and transferring ownership, and nothing else. It
  never lets a caller use, edit, or delete an object. On an object without an ACL, it adds only viewing, because
  there is no owner to recover access from. `operationsViaRecovery` lists the operations that only recovery allows.
  Recovery adds the `view` operation only, not other operations that a type gives the `view` level.
- **Restricted.** A valid ACL is restricted when its general access is lower than the type's default, or when it has
  at least one entry that grants something. `isRestricted` checks the same thing without a caller.

Recovery and the search filter agree at `view`: in recovery spaces, a list of the objects a caller can view shows
every object. Recovery isn't a level, so a filter for a higher level applies the ordinary rules in recovery spaces.
A list built at `manage` therefore leaves out the objects whose access the caller can manage only through recovery.

The decision covers object-level access only. A caller also needs the feature privileges that the operation lists in
the policy.

`generalAccessPermits` checks whether general access alone permits an operation, which is what a request without a
principal gets. A caller uses it to skip resolving the principal and checking recovery when the answer can't change.
An invalid ACL never takes this shortcut, and an operation that the policy doesn't define is never permitted.

`toObjectDecision` turns a decision into the outcome of one operation: `allowed`, `forbidden` when the caller can view
the object, and `not_found` when the caller can't, so that a denial never reveals that the object exists.

## Changing an ACL

`prepareInitialAcl` and `prepareAclChange` check the access a caller asks for, and build the complete ACL to store, in
the shape Kibana writes. They don't store anything. A caller asks for the access of a new object as `InitialAccess`,
and for a change as `AclChange`. Both list grants as `AclGrant`, a level for one principal, because the caller never
sets the owner of a new object, the version, or `added_at`. When a request isn't valid or isn't allowed, they throw an
`AclChangeError`. Its `code` is `bad_request`, `forbidden`, `not_found`, or `conflict`, which a caller returns as 400,
403, 404, or 409. When OLS is disabled, both refuse every request for access.

Requested access follows these rules in both functions:

- General access is a level the type allows for general access.
- Each entry names a known principal kind and a non-empty ID, once, with a level the type allows for entries.
- An entry for the owner is dropped, because ownership already covers it.
- A request has at most `MAX_ACL_ENTRIES` (100) entries. An entry for the owner counts, even though it's
  dropped.

Both also return `principalsToCheck`: the principals who get access they didn't have before. The caller checks that each
one exists before storing the ACL. The list holds the recipient of every new or higher entry, the new owner of a
transfer, and, when a replacement repairs an invalid ACL, its owner and every entry. Unchanged and lower grants aren't
listed, so that a deleted or disabled recipient never blocks an unrelated change. A caller who becomes the owner of a
new or claimed object isn't listed either.

`prepareInitialAcl` builds the ACL of a new object. The caller becomes the owner, general access is the requested
level or the type's default, and every entry gets the current time as `added_at`. A request without a principal
creates the object without an ACL, so the type's default applies. Asking for anything else, such as entries or other
general access, is refused, because nobody could own the object.

`prepareAclChange` takes the caller's decision for the current ACL, recovery included, and one of three changes. A
caller who can't view the object gets `not_found` before any other check, as with `toObjectDecision`, because every
other refusal reveals something about the object, such as that it exists or already has an ACL.

- **`replace`** sets general access and replaces every entry. It keeps the owner, and needs `manage_access`. The
  stored owner has to be a single principal: one known kind and exactly one ID. Otherwise, the replacement is refused,
  and only a transfer can repair the ACL. A kept entry keeps its `added_at`, even when its level changes, or gets the
  current time when it has none.
- **`claim`** makes the caller the owner of an object without an ACL, with the requested or the default general
  access and no entries. It needs `edit` and a principal. An object with an ACL, even an invalid one, can't be
  claimed.
- **`transfer`** makes another principal the owner. It needs `transfer`, so only the owner or a recovery
  administrator can do it. The former owner keeps nothing: entries for the former and the new owner are dropped. The
  rest of the ACL is kept as `readEditableAcl` reads it, so a transfer also repairs an invalid ACL. Kept entries aren't
  checked again, so that one deleted recipient can't block the only way to repair the ACL. For the same reason, they
  don't count against `MAX_ACL_ENTRIES`: an ACL stored from outside Kibana can have more, and the new owner trims them
  with a replacement. An object without an ACL has nobody to transfer from, so it needs a claim instead.

`readEditableAcl` reads an object's current access from its stored ACL into an `EditableAcl`, so that it can be shown,
edited, or written back in the shapes Kibana writes. It keeps only what grants something. An entry with several IDs
becomes one entry for each ID, an entry that grants nothing is dropped, and several entries for one principal keep the
highest grant. The owner is read only when it is a single principal.

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

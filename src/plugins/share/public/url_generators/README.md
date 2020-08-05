## URL Generator Services

Developers who maintain pages in Kibana that other developers may want to link to
can register a direct access link generator. This provides backward compatibility support
so the developer of the app/page has a way to change their url structure without
breaking users of this system.  If users were to generate the urls on their own, 
using string concatenation, those links may break often.

Owners: Kibana App Arch team.

## Producer Usage

If you are registering a new generator, don't forget to add a mapping of id to state

```ts
declare module '../../share/public' {
  export interface UrlGeneratorStateMapping {
    [MY_GENERATOR]: MyState;
  }
}
```

### Migration

Once your generator is released, you should *never* change the `MyState` type, nor the value of `MY_GENERATOR`.
Instead, register a new generator id, with the new state type, and add a migration function to convert to it.

To avoid having to refactor many run time usages of the old id, change the _value_ of the generator id, but not
the name itself. For example:

Initial release:
```ts
export const MY_GENERATOR = 'MY_GENERATOR';
export const MyState {
  foo: string;
}
export interface UrlGeneratorStateMapping {
  [MY_GENERATOR]: UrlGeneratorState<MyState>;
}
```

Second release:
```ts
  // Value stays the same here! This is important.
  export const MY_LEGACY_GENERATOR_V1 = 'MY_GENERATOR';
  // Always point the const `MY_GENERATOR` to the most
  // recent version of the state to avoid a large refactor.
  export const MY_GENERATOR = 'MY_GENERATOR_V2';

  // Same here, the mapping stays the same, but the names change.
  export const MyLegacyState {
    foo: string;
  }
  // New type, old name!
  export const MyState {
    bar: string;
  }
  export interface UrlGeneratorStateMapping {
    [MY_LEGACY_GENERATOR_V1]: UrlGeneratorState<MyLegacyState, typeof MY_GENERATOR, MyState>;
    [MY_GENERATOR]: UrlGeneratorState<MyState>;
  }
```

### Examples

Working examples of registered link generators can be found in `examples/url_generator_examples` folder. Run these
examples via

```
yarn start --run-examples
```

## Consumer Usage

Consumers of this service can use the ids and state to create URL strings:

```ts
  const { id, state } = getLinkData();
  const generator = urlGeneratorPluginStart.getLinkGenerator(id);
  if (generator.isDeprecated) {
    // Consumers have a few options here.

    // If the consumer constrols the persisted data, they can migrate this data and
    // update it. Something like this:
    const { id: newId, state: newState } = await generator.migrate(state);
    replaceLegacyData({ oldId: id, newId, newState });

    // If the consumer does not control the persisted data store, they can warn the
    // user that they are using a deprecated id and should update the data on their
    // own.
    alert(`This data is deprecated, please generate new URL data.`);

    // They can also choose to do nothing. Calling `createUrl` will internally migrate this
    // data. Depending on the cost, we may choose to keep support for deprecated generators
    // along for a long time, using telemetry to make this decision. However another
    // consideration is how many migrations are taking place and whether this is creating a
    // performance issue.
  }
  const link = await generator.createUrl(savedLink.state);
```

**As a consumer, you should not persist the url string!**

As soon as you do, you have lost your migration options. Instead you should store the id
and the state object. This will let you recreate the migrated url later.

### Examples

Working examples of consuming registered link generators can be found in `examples/url_generator_explorer` folder. Run these
via

```
yarn start --run-examples
```

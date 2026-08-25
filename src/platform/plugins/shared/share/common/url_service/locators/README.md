# Locators

## Locators service

Developers who maintain pages in Kibana that other developers may want to link to
can register a *locator*. Locators provide backward compatibility support
so the developer of the app/page has a way to change their url structure without
breaking users of this system. If users were to generate the URLs on their own, 
using string concatenation, those links may break often.

Owners: __@elastic/appex-sharedux__.


## Producer Usage

Here is how you create a *locator*, which deeply link into your Kibana app:

```ts
plugins.share.url.locators.create({
  id: 'MY_APP_LOCATOR',
  getLocation: async (params: { productId: string }) => {
    return {
      app: 'myApp',
      path: `/products/${productId}`,
      state: {},
    };
  },
});
```

When navigation in Kibana is done without a page reload a serializable *location state*
object is passed to the destination app, which the app can use to change its
appearance. The *location state* object does not appear in the URL, but apps
can still use that, similar to how URL parameters are used.

```ts
plugins.share.url.locators.create({
  id: 'MY_APP_LOCATOR',
  getLocation: async (params: { productId: string, tab?: 'pics' | 'attributes' }) => {
    return {
      app: 'myApp',
      path: `/products/${productId}`,
      state: {
        tab: params.tab || 'pics',
      },
    };
  },
});
```

When you want to change the shape of the parameters that the locator receives, you can
provide a migration function, which can transform the shape of the parameters from
one Kibana version to another. For example, below we replace `productId` param by `id`.

```ts
plugins.share.url.locators.create({
  id: 'MY_APP_LOCATOR',
  getLocation: async (params: { id: string, tab?: 'pics' | 'attributes' }) => {
    return {
      app: 'myApp',
      path: `/products/${id}`,
      state: {
        tab: params.tab || 'pics',
      },
    };
  },

  migrations: {
    '7.20.0': ({productId, ...rest}) => {
      return {
        id: productId,
        ...rest,
      };
    },
  },
});
```

The migration version should correspond to Kibana relase when the change was
introduced. It is the responsibility of the *consumer* to make sure they
migrate their stored parameters using the provided migration function to the
latest version. Migrations versions are ordered by semver. As a consumer,
if you persist somewhere a locator parameters object, you also want to store
the version of that object, so later you know from starting from which
version you need to execute migrations.


## Consumer Usage

Consumers of the Locators service can use the locators to generate deep links
into Kibana apps, or navigate to the apps while passing the *location state* to 
the destination app.

First you will need to get hold of the *locator* for the app you want to
navigate to.

Usually, that app will return it from its plugin contract from the "setup"
life-cycle:

```ts
class MyPlugin {
  setup(core, plugins) {
    const locator = plugins.destinationApp.locator;
  }
}
```

Or, you can get hold of any locator from the central registry:

```ts
class MyPlugin {
  setup(core, plugins) {
    const locator = plugins.share.url.locators.get('DESTINATION_APP_LOCATOR');
  }
}
```

Once you have the locator, you can use it to navigate to some Kibana app:

```ts
await locator.navigate({
  productId: '123',
});
```

You can also use it to generate a URL string of the destination:

```ts
const url = await locator.getUrl({
  productId: '123',
});
```

#### Migrations

**As a consumer, you should not persist the resulting URL string!**

As soon as you do, you have lost your migration options. Instead you should
store the ID, version, and params of your locator. This will let you
re-create the migrated URL later.

If, as a consumer, you store the ID, version, and params of the locator, you
should use the migration functions provided by the locator when migrating
between Kibana versions.

```ts
const migration = locator.migrations[version];

if (migration) {
  params = migration(params);
}
```


### Examples

You can view the provided example plugins to learn more how to work with locators.
There are two plugins (`locator_examples` and `locator_explorer`) provided in the
`/examples` folder. You can run the example plugins using the following command:

```
yarn start --run-examples
```

To view the `locator_explorer` example plugin in Kibana navigate to: __Analytics__ 👉 
__Developer examples__ 👉 __URL locators__.

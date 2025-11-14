---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/ui-settings-service.html
---

# UI settings service [ui-settings-service]

::::{note}
The UI settings service is available both server and client side.
::::


## Overview [_overview]

UI settings are configurable from the Advanced Settings page in Management and control the behavior of {{kib}}. uiSettings are stored in a config saved object and, as such, conform to the same conditions as other [Saved Objects](/extend/saved-objects-service.md).

There are several ways to configure an advanced setting:

* [Through the Advanced Settings UI](#advanced-settings-ui)
* [Locked via kibana.yml’s uiSettings.overrides](#uisettings-overrides)
* [Through the client-side uiSettings Service](#client-side-usage)
* [Through the server-side uiSettings Service](#server-side-usage)

Keep in mind that once you add a new advanced setting, you cannot change or remove it without [registering a migration in core](#uisettings-migrations).


## Configuration with Advanced Settings UI [advanced-settings-ui]

The uiSettings service is the programmatic interface to Kibana’s Advanced Settings UI. Kibana plugins use the service to extend Kibana UI Settings Management with custom settings for their plugin.

Configuration through the Advanced Settings UI is restricted to users authorised to acces the Advanced Settings page. Users who don’t have permissions to change these values default to using the settings configured to the space they are in. Config saved objects can be shared between spaces.


## Configuration with UI settings overrides [uisettings-overrides]
```{applies_to}
stack: preview
```

When a setting is configured as an override in kibana.yml, it will override any other value stored in the config saved object. If an override is misconfigured, it will fail config validation and prevent Kibana from starting up. The override applies to Kibana as a whole for all spaces and users and the option will be disabled in the Advanced Settings page. We refer to these as "global" overrides.

Use the top-level `uiSettings` key for this, for example:

```yaml
# Display times in UTC
uiSettings:
  overrides:
    "dateFormat:tz": "UTC"
```


## Client side usage [client-side-usage]

On the client, the `uiSettings` service is exposed directly from `core` and the [client](https://github.com/elastic/kibana//blob/8.9/src/core/packages/ui-settings/server/src/ui_settings_client.ts) provides plugins access to the `config` entries stored in {{es}}.

In the interest of performance, `uiSettings` are cached. Any changes that require cache refreshes should register an instruction to reload the page when settings are configured in Advanced Settings using the `requiresPageReload` [parameter](https://github.com/elastic/kibana//blob/8.9/src/core/packages/ui-settings/common/src/ui_settings.ts).

```typescript
import { CoreSetup, Plugin } from 'src/core/public';

export class MyPlugin implements Plugin<MyPluginSetup, MyPluginStart> {
  public setup(core: CoreSetup): MyPluginSetup {
    …
    core.uiSettings.getUpdate$().subscribe(({ key, newValue }) => {
      if (key === 'custom') {
        // do something with changes...
        myPluginService.register({
          …
        })
      }
    });
    …
  }

  public start(core: CoreStart): MyPluginStart {
    return {
      …
      settings: {
        getCustomValue: () => core.uiSettings.get('custom'),
        …
      },
    };
  }
}
```


## Server side usage [server-side-usage]

On the server, `uiSettings` are exposed directly from `core`.

The following example shows how to register a new `custom` setting with a default value of *42*. When registering a new setting, you must provide a schema against which validations are performed on read and write. All the other [parameters](https://github.com/elastic/kibana//blob/8.9/src/core/packages/ui-settings/common/src/ui_settings.ts) are optional.

```typescript
import { schema } from '@kbn/config-schema';
import type { CoreSetup,Plugin } from '@kbn/core/server';

export class MyPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.uiSettings.register({
      custom: {
        value: '42',
        schema: schema.string(),
      },
    });
    const router = core.http.createRouter();
    router.get({
      path: 'my_plugin/{id}',
      validate: …,
    },
    async (context, request, response) => {
      const customSetting = await context.uiSettings.client.get('custom');
      …
    });
  }
}
```


## Migrations [uisettings-migrations]

::::{important}
Migrations for 3rd party plugin advanced settings are not currently supported. If a 3rd party plugin registers an advanced setting, the setting is essentially permanent and cannot be fixed without manual intervention.

::::


To change or remove a `uiSetting`, the whole `config` Saved Object needs to be migrated.

For example, if we wanted to remove a `custom` setting, or rename `my_setting:fourtyTwo` to `my_other_setting:fourtyTwo`, we’d need two migration entries, one for each change targeting the version in which these changes apply:

```typescript
export const migrations = {
  ...
  '8.1.0': (doc: SavedObjectUnsanitizedDoc<any>): SavedObjectSanitizedDoc<any> => ({
  ...doc,
  ...(doc.attributes && {
    attributes: Object.keys(doc.attributes).reduce(
      (acc, key) =>
        [
          // other settings to remove for 8.1.0...
          'custom',
        ].includes(key)
          ? {
              ...acc,
            }
          : {
              ...acc,
              [key]: doc.attributes[key],
            },
      {}
    ),
  }),
  references: doc.references || [],
  }),
  '8.2.0': (doc: SavedObjectUnsanitizedDoc<any>): SavedObjectSanitizedDoc<any> => ({
    ...doc,
    ...(doc.attributes && {
      attributes: Object.keys(doc.attributes).reduce(
        (acc, key) =>
          key.startsWith('my_setting:')
            ? {
                ...acc,
                [key.replace('my_setting', 'my_other_setting')]: doc.attributes[key],
              }
            : {
                ...acc,
                [key]: doc.attributes[key],
              },
        {}
      ),
    }),
    references: doc.references || [],
  }),
  …
}
```

::::{tip}
Plugins can leverage the optional deprecation parameter on registration for handling deprecation notices and renames. The deprecation warnings are rendered in the Advanced Settings UI and should also be added to the [Configure Kibana](/reference/configuration-reference/general-settings.md) guide.

::::




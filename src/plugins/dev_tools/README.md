# Dev tools plugin

The ui/registry/dev_tools is removed in favor of the `devTools` plugin which exposes a register method in the setup contract.
Registering app works mostly the same as registering apps in core.application.register.
Routing will be handled by the id of the dev tool - your dev tool will be mounted when the URL matches `/app/dev_tools#/<YOUR ID>`.
This API doesn't support angular, for registering angular dev tools, bootstrap a local module on mount into the given HTML element.

During the migration this plugin exposes the registered dev tools in the start contract. This is necessary to keep the dev tools app
which is still living in the legacy platform working and will be removed once everything is moved over to the new platform. It should
not be used by other plugins.

## Example registration

```ts
// For legacy plugins
import { npSetup } from 'ui/new_platform';
npSetup.plugins.devTools.register(/* same details here */);

// For new plugins: first add 'devTools' to the list of `optionalPlugins` 
// in your kibana.json file. Then access the plugin directly in `setup`:

class MyPlugin {
  setup(core, plugins) {
    if (plugins.devTools) {
      plugins.devTools.register(/* same details here. */);
    }
  }
}
```

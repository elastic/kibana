---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/kibana-platform-api.html
---

# Kibana Core API [kibana-platform-api]

::::{warning}
This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
::::


{{kib}} Core provides a set of low-level API’s required to run all {{kib}} plugins. These API’s are injected into your plugin’s lifecycle methods and may be invoked during that lifecycle only:

```typescript
import type { PluginInitializerContext, CoreSetup, CoreStart } from '@kbn/core/server';

export class MyPlugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    // called when plugin is setting up during Kibana's startup sequence
  }

  public start(core: CoreStart) {
    // called after all plugins are set up
  }

  public stop() {
    // called when plugin is torn down during Kibana's shutdown sequence
  }
}
```

The services that core provides are:

* [Application service](/extend/application-service.md)
* [Configuration service](/extend/configuration-service.md)
* [Elasticsearch service](/extend/elasticsearch-service.md)
* [HTTP service](/extend/http-service.md)
* [Logging service](/extend/logging-service.md)
* [Saved Objects service](/extend/saved-objects-service.md)
* [UI settings service](/extend/ui-settings-service.md)

::::{note}
Core provides the {{kib}} building blocks for plugins and is implemented as a collection of [packages](/extend/core-packages.md).
::::



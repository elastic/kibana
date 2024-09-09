# Discover Shared

A stateful layer to register shared features and provide an access point to discover without a direct dependency.

## Register new features

The plugin exposes a service to register features that can be opinionatedly used in Discover on both the setup and start lifecycle hooks.

Although this allows for greater flexibility, its purpose is not to customize Discover as a default choice but to be used as a solution to prevent cyclic dependency between plugins that interact with Discover.

To register a new feature, let's take a more practical case.

> _We want to introduce the LogsAIAssistant in the Discover flyout. Porting all the logic of the Observability AI Assistant into Discover is not an option, and we don't want Discover to directly depend on the AI Assistant codebase._

We can solve this case with some steps:

### Define a feature registration contract

First of all, we need to define an interface to which the plugin registering the AI Assistant and Discover can adhere.

The `DiscoverFeaturesService` already defines a union of available features and uses them to strictly type the exposed registry from the discover_shared plugin, so we can update it with the new feature:

```tsx
// src/plugins/discover_shared/public/services/discover_features/types.ts

export interface SecurityAIAssistantFeature {
  id: 'security-ai-assistant';
  render: (/* Update with deps required for this integration */) => React.ReactNode;
  // Add any prop required for the feature
}

export interface ObservabilityLogsAIAssistantFeature {
  id: 'observability-logs-ai-assistant';
  render: (deps: {doc: DataTableRecord}) => React.ReactNode;
  // Add any prop required for the feature
}

// This should be a union of all the available client features.
export type DiscoverFeature = SecurityAIAssistantFeature | ObservabilityLogsAIAssistantFeature;
```

### Discover consumes the registered feature

Once we have an interface for the feature, Discover can now retrieve it and use its content if is registered by any app in Kibana.

```tsx
// Somewhere in the unified doc viewer

function LogsOverviewAIAssistant ({ doc }) {
  const { discoverShared } = getUnifiedDocViewerServices();

  const logsAIAssistantFeature = discoverShared.features.registry.getById('observability-logs-ai-assistant')

  if (logsAIAssistantFeature) {
    return logsAIAssistantFeature.render({ doc })
  }
}
```

### Register the feature

Having an interface for the feature and Discover consuming its definition, we are left with the registration part.

For our example, we'll go to the logs app that owns the LogsAIAssistant codebase and register the feature:

```tsx
// x-pack/plugins/observability_solution/logs_shared/public/plugin.ts

export class LogsSharedPlugin implements LogsSharedClientPluginClass {
  // The rest of the plugin implementation is hidden for a cleaner example

  public start(core: CoreStart, plugins: LogsSharedClientStartDeps) {
    const {  observabilityAIAssistant } = plugins;

    const LogAIAssistant = createLogAIAssistant({ observabilityAIAssistant });

    // Strict typing on the registry will let you know which features you can register
    plugins.discoverShared.features.registry.register({
      id: 'observability-logs-ai-assistant',
      render: ({doc}) => <LogAIAssistant doc={doc}/>
    })

    return {
      LogAIAssistant,
    };
  }
}
```

At this point, the feature should work correctly when registered and we have not created any direct dependency between the Discover and LogsShared apps.
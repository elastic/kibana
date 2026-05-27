# Kibana Navigation Plugin

## Overview

The Navigation plugin provides reusable UI components and services for navigation within Kibana. It serves as a bridge between the core navigation services and the UI layer, offering standardized components that can be used across different parts of the application.

## Plugin Start Contract

The Navigation plugin's start contract provides the following:

```typescript
interface NavigationPublicStart {
  ui: {
    /**
    * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
    */
    TopNavMenu: (props: TopNavMenuProps<Query>) => React.ReactElement;
    /**
    * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
    */
    AggregateQueryTopNavMenu: (props: TopNavMenuProps<AggregateQuery>) => React.ReactElement;
    /**
    * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
    */
    createTopNavWithCustomContext: (
      customUnifiedSearch?: UnifiedSearchPublicPluginStart,
      customExtensions?: RegisteredTopNavMenuData[]
    ) => ReturnType<typeof createTopNav>;
  };
  /** Add a solution navigation to the header nav switcher. */
  addSolutionNavigation: (solutionNavigationAgg: AddSolutionNavigationArg) => void;
  /** Flag to indicate if the solution navigation is enabled.*/
  isSolutionNavEnabled$: Observable<boolean>;
}
```

## Key Components

## Integration with Core Services

This plugin works closely with Kibana's core navigation services:

- **ProjectNavigationService**: The source of truth for navigation state
- **ChromeService**: Orchestrates UI and bridges services with React components

The plugin consumes data from these services and provides React components that adhere to Kibana's design system.

## Solution Navigation

The plugin supports "Solution Navigation" - a feature that allows different Kibana solutions (like Observability, Security, etc.) to define their own navigation structures. This enables a more tailored experience for each solution.

> **Note**: This plugin provides navigation for stateful deployments. For serverless deployments, see the [Serverless Navigation](/x-pack/platform/plugins/shared/serverless/public/navigation/README.md) implementation, which uses a different registration mechanism.

## Usage

### Using SideNavComponent

You don't typically import and use SideNavComponent directly. Instead, you define a navigation tree and register it with the navigation plugin using the `addSolutionNavigation` service.

Example from Enterprise Search plugin:

```typescript
// In your plugin's start method
public start(core: CoreStart, plugins: PluginsStart) {
  // Initialize any dynamic navigation items if needed
  private readonly sideNavDynamicItems$ = new BehaviorSubject<DynamicSideNavItems>({});

  // Import your navigation tree definition
  import('./navigation_tree').then(({ getNavigationTreeDefinition }) => {
    // Register your solution's navigation with the navigation plugin
    return plugins.navigation.addSolutionNavigation(
      getNavigationTreeDefinition({
        dynamicItems$: this.sideNavDynamicItems$,
      })
    );
  });
}
```

This approach allows your plugin to define its own navigation structure while leveraging the core navigation infrastructure.

### Monitoring Navigation State

The start contract provides an observable to monitor whether solution navigation is enabled:

```typescript
// Subscribe to navigation enablement changes
plugins.navigation.isSolutionNavEnabled$.subscribe((isEnabled) => {
  // React to changes in navigation enablement
  if (isEnabled) {
    // Solution navigation is enabled
  } else {
    // Solution navigation is disabled
  }
});
```

This is useful for conditionally rendering UI elements based on the navigation state.

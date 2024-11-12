# Discover context awareness

**If you're looking for available extension point definitions, they're located in the `Profile` interface in [`types.ts`](types.ts).**

## Summary

The Discover context awareness framework allows Discover's UI and functionality to adapt to the surrounding context of the page, including solution type, data source, current search parameters, etc., in order to provide curated data exploration experiences across a variety of data types and scenarios. Support for this is implemented through a system of profiles that map to distinct context levels, and extension points that provide interfaces for customizing specific aspects of Discover.

## Concepts

### Context levels

There are currently three context levels supported in Discover:

- Root context:
  - Based on the current solution type.
  - Resolved at application initialization.
  - Runs synchronously or asynchronously.
- Data source context:
  - Based on the current ES|QL query or data view.
  - Resolved on ES|QL query or data view change, before data fetching occurs.
  - Runs synchronously or asynchronously.
- Document context:
  - Based on individual ES|QL records or ES documents.
  - Resolved individually for each ES|QL record or ES document after data fetching runs.
  - Runs synchronously only.

### Composable profiles

Discover uses a concept called "composable profiles" to support context awareness. Composable profiles are implementations of a core `Profile` interface (or a subset of it) containing all of the available extension points Discover supports. A composable profile can be implemented at any context level through a "profile provider", responsible for defining the composable profile and its associated context resolution method, called `resolve`. Each provider's `resolve` method is passed a parameters object specific to its context level, which it uses to determine if its associated `profile` is a match. In cases where it is a match, the `resolve` method also returns related metadata in a `context` object.

Within Discover there is always one resolved root profile, one resolved data source profile (as long as search results exist), and a resolved document profile for each search result in the data grid. Profile providers have access to the `context` objects of higher level providers within their `resolve` method (`root` > `data source` > `document`), making it possible to create context-dependent profiles. For example, an `oblt-logs-data-source` profile which is used when the current solution type is Observability, and the current data source contains logs data.

Definitions for the core `Profile` interface are located in the [`types.ts`](types.ts) file.

Definitions for the available profile provider types are located in the [`profiles`](./profiles) folder.

### Merged accessors

Composable profiles operate similarly to middleware in that each of their extension point implementations are passed a `prev` argument, which can be called to access the results from profiles at previous context levels, and allows overwriting or composing a final result from the previous results. The function Discover calls to trigger the extension point merging process and obtain a final result from the combined profiles is referred to as a "merged accessor".

The merging order for profiles is based on the context level hierarchy (`root` > `data source` > `document`), meaning the root profile is passed a base implementation as its `prev` argument, the data source profile is passed the root implementation as `prev` (if one exists, otherwise the base implementation), and document profiles are passed the data source implementation as `prev` (if one exists, otherwise the root or base implementation).

The following diagram illustrates the extension point merging process:
![image](./docs/merged_accessors.png)

Additionally, extension point implementations are passed an `accessorParams` argument as the second argument after `prev`. This object contains additional parameters that may be useful to extension point implementations, primarily the current `context` object. This is most useful in situations where consumers want to [customize the `context` object](#custom-context-objects) with properties specific to their profile, such as state stores and asynchronously initialized services.

Definitions for composable profiles and the merging routine are located in the [`composable_profile.ts`](./composable_profile.ts) file.

### Supporting services

The context awareness framework is driven by two main supporting services called `ProfileService` and `ProfilesManager`.

Each context level has a dedicated profile service, e.g. `RootProfileService`, which is responsible for accepting profile provider registrations and looping over each provider in order during context resolution to identify a matching profile. Each resolution call can result in only one matching profile, which is the first to return a match based on execution order.

A single `ProfilesManager` is instantiated on Discover load, or one per saved search panel in a dashboard. The profiles manager is responsible for the following:

- Managing state associated with the current Discover context.
- Coordinating profile services and exposing resolution methods for each context level.
- Providing access to the combined set of resolved profiles.
- Deduplicating profile resolution attempts with identical parameters.
- Error handling and fallback behaviour on profile resolution failure.

`ProfileService` definitions and implementation are located in the [`profiles_service.ts`](./profile_service.ts) file.

The `ProfilesManager` implementation is located in the [`profiles_manager.ts`](./profiles_manager.ts) file.

### Putting it all together

The following diagram models the overall Discover context awareness framework and how each of the above concepts come together:
![image](./docs/architecture.png)

## Code organization

One of the core ideas of the context awareness framework is that Discover is still a single application which should know about which profiles it supports and directly import the code needed to support them. This is why profile registrations are all handled internally to the plugin instead of having a registration system exposed through the plugin contract. This approach comes with several main benefits:

- There is a single, central place where all profile registrations happen, which is much easier to maintan versus scattered registrations.
- The Data Discovery team remains aware of which profiles exist and what changes are made. This is critical to ensure the Data Discovery team is able to provide adequate customer and SDH support for Discover.
- Common code and utilities can be easily shared across profiles since they need to be accessible to Discover by default, rather than being scattered throughout various plugin codebases.

It also comes with an important drawback: **Discover cannot depend on other plugins (e.g. solution plugins) to import code for profiles due to the dependency graph issues it would create.**

This means that in an ideal situation, the code for Discover profiles should either live directly within the Discover codebase, or within dedicated packages which Discover imports from:

- When adding solution specific code directly to the Discover codebase, it should be done in an organized way in order to support shared ownership. For example, the [`profile_providers/security`](./profile_providers/security) folder contains code specific to Security Solution maintained profiles, and an override has been added to the [`CODEOWNERS`](/.github/CODEOWNERS) file to reflect the shared ownership of this folder.
- When creating a dedicated package for some profile code, the maintaining team can retain full ownership over the package, and Discover is only responsible for importing the functionality and adding it to the associated profile registration.

There are situations where neither of the above two options are viable, such as when migrating large pieces of functionality from a solution plugin to a Discover profile, which could be time consuming and involve moving huge amounts of code to packages. For these situations, there's a [discover_shared](/src/plugins/discover_shared) plugin specifically to support inversion of control for Discover profile features (see the [`README`](/src/plugins/discover_shared/README.md) for more details).

By ensuring all Discover profiles use the same IoC mechanism, changes or improvements to the system can be centralized, and areas that use it can easily be located. In general, this should be used as a last resort when the benefits of importing directly from packages aren't worth the effort to migrate the code, and ideally teams who use it should have a plan to later refactor the code into packages.

## Registering a profile

In order to register a Discover profile, follow these steps:

1. Identify at which [context level](#context-levels) your profile should be implemented.
2. Create a subfolder for your profile provider within the [`profile_providers`](./profile_providers) folder. Common Discover providers should be created within the `profile_providers/common` subfolder, while solution specific providers should be created within a `profile_providers/{SOLUTION_TYPE}` subfolder, e.g. `profile_providers/security/security_root_profile`.
3. Create a `profile.ts(x)` file within your provider subfolder that exports a factory function which optionally accepts a `ProfileProviderServices` parameter and returns your provider implementation, e.g. `createSecurityRootProfileProvider(services: ProfileProviderServices) => RootProfileProvider`.
4. **If your provider is not ready for GA or should only be enabled for specific configurations, make sure to set the `isExperimental` flag to `true` in your profile provider.** This will ensure the profile is disabled by default, and can be enabled in `kibana.yml` like this: `discover.experimental.enabledProfiles: [{YOUR_PROFILE_ID}]`.
5. Call and return the result of your provider factory function from the corresponding factory function in [`register_profile_providers.ts`](./profile_providers/register_profile_providers.ts), e.g. `createRootProfileProviders`. The order of providers in the returned array determines the execution order during context resolution.

Existing providers can be extended using the [`extendProfileProvider`](./profile_providers/extend_profile_provider.ts) utility, allowing multiple sub profiles to be composed from a shared parent profile.

Example profile provider implementations are located in [`profile_providers/example`](./profile_providers/example).

### Example implementation

```ts
/**
 * profile_providers/common/example_data_source_profile/profile.tsx
 */

import React from 'react';
import { getFieldValue } from '@kbn/discover-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import { DataSourceCategory, DataSourceProfileProvider } from '../../../profiles';
import { ProfileProviderServices } from '../../profile_provider_services';

// Export profile provider factory function, optionally accepting ProfileProviderServices,
// and returning a profile provider for a specific context level
export const createExampleDataSourceProfileProvider = (
  services: ProfileProviderServices
): DataSourceProfileProvider => ({
  // All profiles must have a unique ID
  profileId: 'example-data-source-profile',

  // Set isExperimental flag to true if profile should be disabled by default
  isExperimental: true,

  // The composable profile definition
  profile: {
    // Each available method maps to a Discover extension point
    getCellRenderers: (prev) => () => ({
      // Calling prev() provides access to results from previous context levels,
      // making it possible to compose a result from multiple profiles
      ...prev(),

      // Extend the previous results with a cell renderer for the message field
      message: (props) => {
        const message = getFieldValue(props.row, 'message');
        return <span>Custom message cell: {message}</span>;
      },
    }),
  },

  // The method responsible for context resolution,
  // passed a params object with props specific to the context level,
  // as well as providing access to higher level context objects
  resolve: (params) => {
    let indexPattern: string | undefined;

    // Extract the index pattern from the current ES|QL query or data view
    if (isDataSourceType(params.dataSource, DataSourceType.Esql)) {
      if (!isOfAggregateQueryType(params.query)) {
        return { isMatch: false };
      }

      indexPattern = getIndexPatternFromESQLQuery(params.query.esql);
    } else if (isDataSourceType(params.dataSource, DataSourceType.DataView) && params.dataView) {
      indexPattern = params.dataView.getIndexPattern();
    }

    // If the profile is not a match, return isMatch: false in the result
    if (indexPattern !== 'my-example-logs') {
      return { isMatch: false };
    }

    // If the profile is a match, return isMatch: true in the result,
    // plus a context object containing details of the current context
    return {
      isMatch: true,
      context: { category: DataSourceCategory.Logs },
    };
  },
});

/**
 * profile_providers/register_profile_providers.ts
 */

// Locate the factory function for the matching context level
const createDataSourceProfileProviders = (providerServices: ProfileProviderServices) => [
  // Call the profile provider factory function and return its result in the array
  createExampleDataSourceProfileProvider(providerServices),
  ...createLogsDataSourceProfileProviders(providerServices),
];

/**
 * Navigate to Discover and execute the following ES|QL query
 * to resolve the profile: `FROM my-example-logs`
 */
```

## React context and state management

In the Discover context awareness framework, pieces of Discover’s state are passed down explicitly to extension points as needed. This avoids leaking Discover internals – which may change – to consumer extension point implementations and allows us to be intentional about which pieces of state extension points have access to. This approach generally works well when extension points need access to things like the current ES|QL query or data view, time range, columns, etc. However, this does not provide a solution for consumers to manage custom shared state between their extension point implementations.

In cases where the state for an extension point implementation is local to that implementation, consumers can simply manage the state within the corresponding profile method or returned React component:

```tsx
// Extension point implementation definition
const getCellRenderers = (prev) => (params) => {
  // Declare shared state within the profile method closure
  const blueOrRed$ = new BehaviorSubject<'blue' | 'red'>('blue');

  return {
    ...prev(params),
    foo: function FooComponent() {
      // It's still in scope and can be easily accessed...
      const blueOrRed = useObservable(blueOrRed$, blueOrRed$.getValue());

      return (
        // ...and modified...
        <button onClick={() => blueOrRed$.next(blueOrRed === 'blue' ? 'red' : 'blue')}>
          Click to make bar {blueOrRed === 'blue' ? 'red' : 'blue'}
        </button>
      );
    },
    bar: function BarComponent() {
      const blueOrRed = useObservable(blueOrRed$, blueOrRed$.getValue());

      // ...and we can react to the changes
      return <span style={{ color: blueOrRed }}>Look ma, I'm {blueOrRed}!</span>;
    },
  };
};
```

For more advanced use cases, such as when state needs to be shared across extension point implementations, we provide an extension point called `getRenderAppWrapper`. The app wrapper extension point allows consumers to wrap the Discover root in a custom wrapper component, such as a React context provider. With this approach consumers can handle things like integrating with a state management library, accessing custom services from within their extension point implementations, managing shared components such as flyouts, etc. in a React-friendly way and without needing to work around the context awareness framework:

```tsx
// The app wrapper extension point supports common patterns like React context
const flyoutContext = createContext({ setFlyoutOpen: (open: boolean) => {} });

// App wrapper implementations can only exist at the root level, and their lifecycle will match the Discover lifecycle
export const createSecurityRootProfileProvider = (): RootProfileProvider => ({
  profileId: 'security-root-profile',
  profile: {
    // The app wrapper extension point implementation
    getRenderAppWrapper: (PrevWrapper) =>
      function AppWrapper({ children }) {
        // Now we can declare state high up in the React tree
        const [flyoutOpen, setFlyoutOpen] = useState(false);

        return (
          // Be sure to render the previous wrapper as well
          <PrevWrapper>
            // This is our wrapper -- it uses React context to give extension point implementations
            access to the shared state
            <flyoutContext.Provider value={{ setFlyoutOpen }}>
              // Make sure to render `children`, which is the Discover app
              {children}
              // Now extension point implementations can interact with shared state managed higher
              up in the tree
              {flyoutOpen && (
                <EuiFlyout onClose={() => setFlyoutOpen(false)}>
                  Check it out, I'm a flyout!
                </EuiFlyout>
              )}
            </flyoutContext.Provider>
          </PrevWrapper>
        );
      },
    // Some other extension point implementation that depends on the shared state
    getCellRenderers: (prev) => (params) => ({
      ...prev(params),
      foo: function FooComponent() {
        // Since the app wrapper implementation wrapped Discover with a React context provider,
        // we can now access its values from within our extension point implementations
        const { setFlyoutOpen } = useContext(flyoutContext);

        return <button onClick={() => setFlyoutOpen(true)}>Click me to open a flyout!</button>;
      },
    }),
  },
  resolve: (params) => {
    if (params.solutionNavId === SolutionType.Security) {
      return {
        isMatch: true,
        context: { solutionType: SolutionType.Security },
      };
    }

    return { isMatch: false };
  },
});
```

## Custom `context` objects

By default the `context` object returned from each profile provider's `resolve` method conforms to a standard interface specific to their profile's context level. However, in some situations it may be useful for consumers to extend this object with properties specific to their profile implementation. To support this, profile providers can define a strongly typed `context` interface that extends the default interface, and allows passing properties through to their profile's extension point implementations. One potential use case for this is instantiating state stores or asynchronously initialized services, then accessing them within a `getRenderAppWrapper` implementation to pass to a React context provider:

```tsx
// The profile provider interfaces accept a custom context object type param
type SecurityRootProfileProvider = RootProfileProvider<{ stateStore: SecurityStateStore }>;

export const createSecurityRootProfileProvider = (
  services: ProfileProviderServices
): SecurityRootProfileProvider => ({
  profileId: 'security-root-profile',
  profile: {
    getRenderAppWrapper:
      (PrevWrapper, { context }) =>
      ({ children }) =>
        (
          <PrevWrapper>
            // Custom props can be accessed from the context object available in `accessorParams`
            <SecurityStateProvider stateStore={context.stateStore}>
              {children}
            </SecurityStateProvider>
          </PrevWrapper>
        ),
  },
  resolve: async (params) => {
    if (params.solutionNavId !== SolutionType.Security) {
      return { isMatch: false };
    }

    // Perform async service initialization within the `resolve` method
    const stateStore = await initializeSecurityStateStore(services);

    return {
      isMatch: true,
      context: {
        solutionType: SolutionType.Security,
        // Include the custom service in the returned context object
        stateStore,
      },
    };
  },
});
```

## Overriding defaults

Discover ships with a set of common contextual profiles, shared across Solutions in Kibana (e.g. the current logs data source profile). The goal of these profiles is to provide Solution agnostic contextual features to help improve the default data exploration experience for various data types. They should be generally useful across user types and not be tailored to specific Solution workflows – for example, viewing logs should be a delightful experience regardless of whether it’s done within the Observability Solution, the Search Solution, or the classic on-prem experience.

We’re aiming to make these profiles generic enough that they don’t obstruct Solution workflows or create confusion, but there will always be some complexity around juggling the various Discover use cases. For situations where Solution teams are confident some common profile feature will not be helpful to their users or will create confusion, there is an option to override these defaults while keeping the remainder of the functionality for the target profile intact. To do so a Solution team would follow these steps:

- Create and register a Solution specific root profile provider, e.g. `SecurityRootProfileProvider`.
- Identify the contextual feature you want to override and the common profile provider it belongs to, e.g. the `getDocViewer` implementation in the common `LogsDataSourceProfileProvider`.
- Implement a Solution specific version of the profile provider that extends the common provider as its base (using the `extendProfileProvider` utility), and excludes the extension point implementations you don’t want, e.g. `SecurityLogsDataSourceProfileProvider`. Other than the excluded extension point implementations, the only required change is to update its `resolve` method to first check the `rootContext.solutionType` for the target solution type before executing the base provider’s `resolve` method. This will ensure the override profile only resolves for the specific Solution, and will fall back to the common profile in other Solutions.
- Register the Solution specific version of the profile provider in Discover, ensuring it precedes the common provider in the registration array. The ordering here is important since the Solution specific profile should attempt to resolve first, otherwise the common profile would be resolved instead.

This is how an example implementation would work in code:

```tsx
/**
 * profile_providers/security/security_root_profile/profile.tsx
 */

// Create a solution specific root profile provider
export const createSecurityRootProfileProvider = (): RootProfileProvider => ({
  profileId: 'security-root-profile',
  profile: {},
  resolve: (params) => {
    if (params.solutionNavId === SolutionType.Security) {
      return {
        isMatch: true,
        context: { solutionType: SolutionType.Security },
      };
    }

    return { isMatch: false };
  },
});

/**
 * profile_providers/security/security_logs_data_source_profile/profile.tsx
 */

// Create a solution specific data source profile provider that extends a target base provider
export const createSecurityLogsDataSourceProfileProivder = (
  logsDataSourceProfileProvider: DataSourceProfileProvider
): DataSourceProfileProvider =>
  // Extend the base profile provider with `extendProfileProvider`
  extendProfileProvider(logsDataSourceProfileProvider, {
    profileId: 'security-logs-data-source-profile',
    profile: {
      // Completely remove a specific extension point implementation
      getDocViewer: undefined,
      // Modify the result of an existing extension point implementation
      getCellRenderers: (prev, accessorParams) => (params) => {
        // Retrieve and execute the base implementation
        const baseImpl = logsDataSourceProfileProvider.profile.getCellRenderers?.(
          prev,
          accessorParams
        );
        const baseRenderers = baseImpl?.(params);

        // Return the modified result
        return omit(baseRenderers, 'log.level');
      },
    },
    // Customize the `resolve` implementation
    resolve: (params) => {
      // Only match this profile when in the target solution context
      if (params.rootContext.solutionType !== SolutionType.Security) {
        return { isMatch: false };
      }

      // Delegate to the base implementation
      return logsDataSourceProfileProvider.resolve(params);
    },
  });

/**
 * profile_providers/register_profile_providers.ts
 */

// Register root profile providers
const createRootProfileProviders = (providerServices: ProfileProviderServices) => [
  // Register the solution specific root profile provider
  createSecurityRootProfileProvider(),
];

// Register data source profile providers
const createDataSourceProfileProviders = (providerServices: ProfileProviderServices) => {
  // Instantiate the data source profile provider base implementation
  const logsDataSourceProfileProvider = createLogsDataSourceProfileProvider(providerServices);

  return [
    // Ensure the solution specific override is registered and resolved first
    createSecurityLogsDataSourceProfileProivder(logsDataSourceProfileProvider),
    // Then register the base implementation
    logsDataSourceProfileProvider,
  ];
};
```

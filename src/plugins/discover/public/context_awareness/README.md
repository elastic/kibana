# Discover context awareness

## Summary

The Discover context awareness framework allows Discover's UI and functionality to adapt to the surrounding context of the page, including solution type, data source, current search parameters, etc., in order to provide curated data exploration experiences across a variety of data types and scenarios. Support for this is implemented through a system of profiles that map to distinct context levels, and extension points that provide interfaces for customizing specific aspects of Discover.

## Concepts

### Context levels

We currently support three levels of context in Discover:

- Root context:
  - Based on the current solution type, navigational parameters, etc.
  - Resolved at application initialization and on parameter changes.
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

To support application extensibility based on context, we've introduced the concept of "composable profiles". Composable profiles are implementations of a core `Profile` interface (or a subset of it) containing all of the available extension points Discover supports. A composable profile can be implemented at any context level through a "profile provider", responsible for defining the composable profile and its associated context resolution method. The context resolution method, named `resolve`, determines if its composable profile is a match for the current Discover context, and returns related metadata in a `context` object.

Definitions for the core `Profile` interface are located in the [`types.ts`](types.ts) file.

Definitions for the available profile provider types are located in the [`profiles`](./profiles) folder.

### Merged accessors

Composable profiles operate similarly to middleware in that each of their extension point implementations are passed a `prev` argument, which can be called to access the results from profiles at previous context levels, and allows overwriting or composing a final result from the previous results. The method Discover calls to trigger the extension point merging process and obtain a final result from the combined profiles is referred to as a "merged accessor".

The following diagram illustrates the extension point merging process:
![image](./docs/merged_accessors.png)

Definitions for composable profiles and the merging routine are located in the [`composable_profile.ts`](./composable_profile.ts) file.

### Supporting services

The context awareness framework is driven by two main supporting services called `ProfileService` and `ProfilesManager`.

Each context level has a dedicated profile service, e.g. `RootProfileService`, which is responsible for accepting profile provider registrations and running through each provider in order during context resolution to identify a matching profile.

A single `ProfilesManager` is instantiated on Discover load, or one per saved search panel in a dashboard. The profiles manager is responsible for the following:

- Managing state associated with the current Discover context.
- Coordinating profile services and exposing resolution methods for each context level.
- Providing access to the combined set of resolved profiles.
- Deduplicating profile resolution attempts with identical parameters.
- Error handling and fallback behaviour on profile resolution failure.

`ProfileService` definitions and implementation are located in the [`profiles_service.ts`](./profile_service.ts) file.

The `ProfilesManager` implementation is located in the [`profiles_manager.ts`](./profiles_manager.ts) file.

### Bringing it all together

The following diagram models the overall Discover context awareness framework and how each of the above concepts come together:
![image](./docs/architecture.png)

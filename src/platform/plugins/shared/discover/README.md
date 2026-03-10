# Discover

Contains the Discover application and the saved search embeddable.

## Project tree

### [src/platform/plugins/shared/discover/public](./public)

Contains all the client-only code. When you initially load Discover, [public/application/main](./public/application/main) is executed and displayed. 

* **[/application](./public/application)** \
One folder for every "route", each folder contains files and folders related only to this route.
  * **[/context](./public/application/context)** (Also known as "Surrounding documents" - historically this has been a separate plugin)
  * **[/doc](./public/application/doc)** (Also known as "Single document" - historically this has been a separate plugin)
  * **[/main](./public/application/main)** (Main part of Discover containing the document table)
  * **[/not_found](./public/application/not_found)** (Rendered when a route can't be found)
  * **[/view_alert](./public/application/view_alert)** (Forwarding links in alert notifications)
* **[/components](./public/components)** (All React components used in more than just one app)
* **[/embeddable](./public/embeddable)** (Code related to the Discover session embeddable, rendered on dashboards)
* **[/hooks](./public/hooks)** (Code containing React hooks)
* **[/services](./public/services)** (Services either for external or internal use)
* **[/utils](./public/utils)** (All utility functions used across more than one application)

### [src/platform/plugins/shared/discover/server](./server)

Contains all the server-only code.

* **[/sample_data](./server/sample_data)** (Registrations with the Sample Data Registry for Discover saved objects)
* **[/capabilities_provider](./server/capabilities_provider.ts)** (CapabilitiesProvider definition of capabilities for Core)
* **[/ui_settings](./server/ui_settings.ts)** (Settings and the default values for UiSettingsServiceSetup )
* **[/locator](./server/locator)** (Extensions of DiscoverAppLocator for the DiscoverServerPlugin API)

### [src/platform/plugins/shared/discover/common](./common))

Contains all code shared by client and server.

* **[/constants](./common/constants.ts)** (General contants)
* **[/field_types](./common/field_types.ts)** (Field types constants)
* **[/locator](./common/locator)** (Registration with the URL service for BWC deep-linking to Discover views.)

## Feature flags

See the [Feature flag service](https://docs.elastic.dev/kibana-dev-docs/tutorials/feature-flags-service#dynamic-config) documentation for details on how to use feature flags.

Set constants for feature flag keys in [public/constants.ts](./public/constants.ts).

These are the feature flags used by Discover:


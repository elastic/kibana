---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/development-best-practices.html
---

# Best practices [development-best-practices]

Consider these best practices, whether developing code directly to the {{kib}} repo or building your own plugins. They are intended to support our [{{kib}} development principles](https://github.com/elastic/engineering/blob/master/kibana_dev_principles.md).


## Performance [_performance]

Are you planning with scalability in mind?

* Consider data with many fields
* Consider data with high cardinality fields
* Consider large data sets, that span a long time range
* Are you loading a minimal amount of JS code in the browser?

    * See [Keep {{kib}} fast](/extend/plugin-performance.md) for more guidance.

* Do you make lots of requests to the server?

    * If so, have you considered using the streaming [bfetch service](https://github.com/elastic/kibana/tree/master/src/plugins/bfetch)?



## Accessibility [_accessibility]

Did you know {{kib}} makes a public statement about our commitment to creating an accessible product for people with disabilities? [We do](docs-content://explore-analyze/index.md)! It’s very important all of our apps are accessible.

* Learn how [EUI tackles accessibility](https://elastic.github.io/eui/#/guidelines/accessibility)
* If you don’t use EUI, follow the same EUI accessibility standards


## Localization [kibana-localization-best-practices]

{{kib}} is translated into other languages. Use our i18n utilities to ensure your public facing strings will be translated to ensure all {{kib}} apps are localized.

* Read and adhere to our [i18n guidelines](https://github.com/elastic/kibana/blob/master/src/platform/packages/shared/kbn-i18n/GUIDELINE.md)


## Conventions [_conventions]

* Become familiar with our [styleguide](https://github.com/elastic/kibana/blob/master/STYLEGUIDE.mdx) (use Typescript!)
* Write all new code on [the platform](https://github.com/elastic/kibana/blob/master/src/core/README.md), and following [conventions](https://github.com/elastic/kibana/blob/master/src/core/CONVENTIONS.md).
* *Always* use the `SavedObjectClient` for reading and writing Saved Objects.
* Add `README`s to all your plugins and services.
* Make your public APIs as small as possible. You will have to maintain them, and consider backward compatibility when making any changes to them.
* Use [EUI](https://elastic.github.io/eui) for all your basic UI components to create a consistent UI experience.


## Re-inventing the wheel [_re_inventing_the_wheel]

Over-refactoring can be a problem in it’s own right, but it’s still important to be aware of the existing services that are out there and use them when it makes sense. We have service oriented teams dedicated to providing our solution developers the tools needed to iterate faster. They take care of the nitty gritty so you can focus on creative solutions to your particular problem sphere. Some examples of common services you should consider:

* [Data services](https://github.com/elastic/kibana/tree/master/src/platform/plugins/shared/data/README.mdx)

    * [Search strategies](https://github.com/elastic/kibana/tree/master/src/platform/plugins/shared/data/README.mdx#search)

        * Use the `esSearchStrategy` to make raw queries to ES that will support async searching and partial results, as well as injecting the right advanced settings like whether to include frozen indices or not.

* [Embeddables](https://github.com/elastic/kibana/blob/master/src/platform/plugins/shared/embeddable/README.md)

    * Rendering maps, visualizations, dashboards in your application
    * Register new widgets that will can be added to a dashboard or Canvas workpad, or rendered in another plugin.

* [UiActions](https://github.com/elastic/kibana/tree/master/src/platform/plugins/shared/ui_actions/README.asciidoc)

    * Let other plugins inject functionality into your application
    * Inject custom functionality into other plugins

* Stateless helper utilities
* [state syncing](https://github.com/elastic/kibana/tree/master/src/platform/plugins/shared/kibana_utils/docs/state_sync/README.md) and
* [state container](https://github.com/elastic/kibana/tree/master/src/platform/plugins/shared/kibana_utils/docs/state_containers/README.md) utilities provided by
* [kibana_utils](https://github.com/elastic/kibana/tree/master/src/platform/plugins/shared/kibana_utils/README.md) if you want to sync your application state to the URL?

    * [kibana_react](https://github.com/elastic/kibana/tree/master/src/platform/plugins/shared/kibana_react/README.md) for react specific helpers


Re-using these services will help create a consistent experience across {{kib}} from every solution.


## Backward compatibility [_backward_compatibility]

Eventually we want to guarantee to our plugin developers that their plugins will not break from minor to minor.

Any time you create or change a public API, keep this in mind, and consider potential backward compatibility issues. While we have a formal saved object migration system and are working on adding a formal state migration system, introducing state changes and migrations in a minor always comes with a risk. Consider this before making huge and risky changes in minors, *especially* to saved objects.

* Are you persisting state from registries? Consider what will happen if the author of the implementation changed their interfaces.
* Are you adding implementations to registries? Consider that someone may be persisting your data, and that making changes to your public interfaces can break their code.

Be very careful when changing the shape of saved objects or persistable data.

Saved object exported from past {{kib}} versions should continue to work. In addition, if users are relying on state stored in your app’s URL as part of your public contract, keep in mind that you may also need to provide backwards compatibility for bookmarked URLs.


## Routing, Navigation and URL [_routing_navigation_and_url]

The {{kib}} platform provides a set of tools to help developers build consistent experience around routing and browser navigation. Some of that tooling is inside `core`, some is available as part of various plugins.

[Follow this guide](/extend/kibana-navigation.md) to get an idea of available tools and common approaches for handling routing and browser navigation.


## Testing & stability [_testing_stability]

Review:

* [Unit testing frameworks](/extend/development-tests.md#development-unit-tests)
* [Stability](/extend/stability.md)
* [Security best practices](/extend/security-best-practices.md)
* [Typescript](/extend/typescript.md)







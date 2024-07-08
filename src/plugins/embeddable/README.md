Embeddables are React components that manage their own state, can be serialized and deserialized, and return an API that can be used to interact with them imperatively.

### Guiding principles

#### Coupled to React
Kibana is a React application, and the minimum unit of sharing is the React component. Embeddables enforce this by requiring a React component during registration.

#### Composition over inheritence
Rather than an inheritance-based system with classes, imperative APIs are plain old typescript objects that implement any number of shared interfaces. Interfaces are enforced via type guards and are shared via Packages.

#### Internal state management
Each embeddable manages its own state. This is because the embeddable system allows a page to render a registry of embeddable types that can change over time. This makes it untenable for a single page to manage state for every type of embeddable. The page is only responsible for persisting and providing the last persisted state to the embeddable on startup.

### Key concepts

#### Publishing package
An embeddable API is a plain old typescript object that implements any number of shared interfaces. A shared interface is defined by a publishing package. A publishing package also provides a type guard that is used to check if a given object fulfills the interface.

For example, the [has_edit_capabilites](https://github.com/elastic/kibana/tree/main/packages/presentation/presentation_publishing/interfaces/has_edit_capabilities.ts) publishing package defines the `HasEditCapabilities` interface and the `apiHasEditCapabilities` type guard. The [edit panal action](https://github.com/elastic/kibana/tree/main/src/plugins/presentation_panel/public/panel_actions/edit_panel_action/edit_panel_action.ts) defines the "Edit" panel context menu action. The action's `isCompatible` check uses the `apiHasEditCapabilities` type guard to check that an embeddable API implements the `HasEditCapabilities` interface. When an embeddable API implements the interface and all other conditions of `isCompatible` check are true, the "Edit" action is availabe in the panel context menu. When an embeddable API does not implement the interface, the "Edit" action is not available in the panel context menu.

#### Publishing subject
An embeddable API shares state via a publishing subject, a read only RxJS Observable.

For example, [publishes_panel_title](https://github.com/elastic/kibana/tree/main/packages/presentation/presentation_publishing/interfaces/titles/publishes_panel_title.ts) publishing package defines interfaces and type guards for title state. [initializeTitles](https://github.com/elastic/kibana/tree/main/packages/presentation/presentation_publishing/interfaces/titles/titles_api.ts) provides an implemenation for the titles publishing package. `panelTitle` is provided as a publishing subject. [PresentationPanelInternal React component](https://github.com/elastic/kibana/tree/main/src/plugins/presentation_panel/public/panel_component/presentation_panel_internal.tsx) uses a hook to consume `panelTitle` as React state. Changes to `panelTitle` publishing subject updates React state, which in turn, causes the UI to re-render with the current value. [CustomizePanelEditor React component](https://github.com/elastic/kibana/tree/main/src/plugins/presentation_panel/public/panel_actions/customize_panel_action/customize_panel_editor.tsx) uses `api.setPanelTitle` to set the title on save.

#### Comparators
Comparators allow a page to track changes to an embeddable's state. For example, Dashboard uses comparators to display a UI notification for unsaved changes, to reset changes, and persist unsaved changes to session storage.

A comparator must be provided for each property in an embeddable's RuntimeState. A comparator is a 3 element tuple: where the first element is a publishing subject providing the current value. The second element is a setter allowing the page to reset the value. The third element is an optional comparator function which provides logic to diff this property.

For example, [initializeTitles](https://github.com/elastic/kibana/tree/main/packages/presentation/presentation_publishing/interfaces/titles/titles_api.ts) provides an implemenation for the titles publishing package. Comparitors are provided for each property from `SerializedTitles`.

### Best practices

#### Do not use Embeddables to share Components between plugins
Only create an embeddable if your Component is rendered on a page that persists embeddable state and renders multiple embeddable types. For example, create an embeddable to render your Component on a Dashboard. Otherwise, use a vanilla React Component to share Components between plugins. 

#### Do not use Embeddables to avoid circular plugin dependencies
Break your Component into a Package or another plugin to avoid circular plugin dependencies.

#### Minimal API surface area
Embeddable APIs are accessable to all Kibana systems and all embeddable siblings and parents. Functions and state that are internal to an embeddable including any child components should not be added to the API. Consider passing internal state to child as props or react context.

#### Error handling
Embeddables should never throw. Instead, use [PublishesBlockingError](https://github.com/elastic/kibana/blob/main/packages/presentation/presentation_publishing/interfaces/publishes_blocking_error.ts) interface to surface unrecoverable errors. When an embeddable publishes a blocking error, the parent component will display an error component instead of the embeddable Component. Be thoughtful about which errors are surfaced with the PublishesBlockingError interface. If the embeddable can still render, use less invasive error handling such as a warning toast or notifications in the embeddable Component UI.

### Examples

Examples available at [/examples/embeddable_examples](https://github.com/elastic/kibana/tree/main/examples/embeddable_examples)

- [Register an embeddable](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/search/register_search_embeddable.ts)
- [Embeddable that responds to Unified search](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/search/search_react_embeddable.tsx)
- [Embeddable that interacts with sibling embeddables](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/data_table/data_table_react_embeddable.tsx)
- [Embeddable that can be by value or by reference](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/saved_book/saved_book_react_embeddable.tsx)
- [Render an embeddable](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/search/search_embeddable_renderer.tsx)

Run examples with `yarn start --run-examples`
To access example embeddables, create a new dashboard, click "Add panel" and finally select "Embeddable examples".
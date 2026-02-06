## Table of Contents

  - [Public](#public)
    - [Guiding principles](#guiding-principles)
    - [Embeddable overview](#embeddable-overview)
    - [Publishing packages](#publishing-packages)
    - [Embeddable panel](#embeddable-panel)
    - [Best practices](#best-practices)
    - [Examples](#examples)
  - [Server](#server)
    - [REST APIs](#rest-apis-considerations)
    - [Transforms](#transforms)


## Public

### Guiding principles

#### Coupled to React
Kibana is a React application, and the minimum unit of sharing is the React component. Embeddables enforce this by requiring a React component during registration.

#### Composition over inheritence
Rather than an inheritance-based system with classes, imperative APIs are plain old typescript objects that implement any number of shared interfaces. Interfaces are enforced via type guards and are shared via Packages.

#### Internal state management
Each embeddable manages its own state. This is because the embeddable system allows a page to render a registry of embeddable types that can change over time. This makes it untenable for a single page to manage state for every type of embeddable. The page is only responsible for persisting and providing the last persisted state to the embeddable on startup. For implementation details, see [Embeddable state management example](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/app/state_management_example/state_management_example.tsx).

An embeddable API shares state via a publishing subject, a read only RxJS Observable. An embeddable API shares setter methods for updating state.

### Embeddable overview
Embeddables are React components that manage their own state, can be serialized and deserialized, and return an API that can be used to interact with them imperatively.

Plugins register new embeddable types with the embeddable plugin.
```
embeddablePublicSetup.registerReactEmbeddableFactory('myEmbeddableType', async () => {
  const { myEmbeddableFactory } = await import('./embeddable_module');
  return myEmbeddableFactory;
});
```

Embeddables are rendered with `EmbeddableRenderer` React component.

### Publishing packages
An embeddable API is a plain old typescript object that implements any number of shared interfaces. A shared interface is defined by a publishing package. A publishing package also provides a type guard that is used to check if a given object fulfills the interface.

#### Common publishing packages
The table below lists interface implemenations provided by `EmbeddableRenderer` React component. An embeddable does not need to implement these interfaces as they are already provided.

| Interface | Description |
| ----------| ----------- |
| HasType | Interface for accessing embeddable type |
| PublishesPhaseEvents | Interface for accessing embeddable phase such as loaded, rendered, or error |
| HasUniqueId | Interface for accessing embeddable uuid |
| CanLockHoverActions | Interface for locking hover actions for an embeddable |

The table below lists required publishing package interfaces. An embeddable must implement these interfaces.

| Interface | Description |
| ----------| ----------- |
| HasSerializableState | Interface for serializing embeddable state |

The table below lists optional publishing package interfaces. Embeddables may implement these interfaces. Embeddables without interface implemenations will not show UiActions that require an interface.

| Interface | Description | Used by |
| --------- | ----------- | --------- |
| HasDynamicActions | Interface for accessing dynamic actions. Dynamics actions are actions that manage their own state. Dynamic action state is stored in embeddable state but managed by the dynamic action. | OPEN_FLYOUT_ADD_DRILLDOWN, OPEN_FLYOUT_EDIT_DRILLDOWN |
| HasEditCapabilities | Interface for editing embeddable state | ACTION_EDIT_PANEL | 
| HasInspectorAdapters | Interface for accessing embeddable inspector adaptors | ACTION_INSPECT_PANEL, ACTION_EXPORT_CSV |
| HasLibraryTransforms | Interface for linking to and unlinking from the library | ACTION_ADD_TO_LIBRARY, ACTION_UNLINK_FROM_LIBRARY |
| HasReadOnlyCapabilities | Interface for showing the embeddable configuration for read only users | ACTION_SHOW_CONFIG_PANEL |
| HasSupportedTriggers | Inteface for publishing drilldown triggers | OPEN_FLYOUT_ADD_DRILLDOWN, OPEN_FLYOUT_EDIT_DRILLDOWN |
| PublishesBlockingError | Interface for publishing unrecoverable errors | Embeddable panel to display error state |
| PublishesDataLoading | Interface for publishing when embeddable is loading | Auto refresh |  
| PublishesDataViews | Interface for accessing embeddable data views | Unified search bar type ahead, ACTION_CUSTOMIZE_PANEL, ACTION_EXPLORE_DATA |
| PublishesDescription | Interface for accessing embeddable description | Panel title bar tooltip content, ACTION_CUSTOMIZE_PANEL |
| PublishesWritableDescription | Interface for setting embeddable description | ACTION_CUSTOMIZE_PANEL |
| PublishesRendered | Interface for publishing rendered complete | |
| PublishesSavedObjectId | Interface for surfacing saved object id | |
| PublishesTimeRange | Interface for accessing time range state | ACTION_CUSTOMIZE_PANEL, CUSTOM_TIME_RANGE_BADGE |
| PublishesWritableTimeRange | Interface for setting time range state | ACTION_CUSTOMIZE_PANEL |
| PublishesTitle | Interface for accessing embeddable title | Panel title bar content, ACTION_CUSTOMIZE_PANEL |
| PublishesWritableTitle | Interface for setting embeddable title | ACTION_CUSTOMIZE_PANEL |
| PublishesUnifiedSearch | Interface for publishing unified search state | BADGE_FILTERS_NOTIFICATION |
| PublishesUnsavedChanges | Interface for publishing when embeddable has unsaved changes | Dashboard unsaved chnages notification and reset |

#### Custom publishing packages
Embeddables can expose interfaces unique to a single embeddable implemenation.
The table below lists interfaces that only apply to single embeddable types.
These interfaces may be used by actions to imperatively interact with specific embeddable types.

| Interface | Description | Used by |
| --------- | ----------- | --------- |
| HasVisualizeConfig | Interface for accessing Visualize embeddable state | ACTION_EDIT_IN_LENS, CONVERT_LEGACY_MARKDOWN_ACTION_ID, ACTION_DEPRECATION_BADGE |
| LensApiCallbacks | Inteface implements Lens API | ADD_TO_EXISTING_CASE_ACTION_ID, ACTION_OPEN_IN_DISCOVER |
| PublishesSavedSearch | Interface for accessing Discover session embeddable state | generateCsvReport | 

### Embeddable panel
The `EmbeddableRenderer` React component wraps the embeddable component in an embeddable panel. The embeddable panel provides UI elements for interacting with the embeddable.

The embeddable panel uses UiActions and Triggers registry to make the embeddable UI extensible. The table below lists the trigger events used by the embeddable panel.

| Trigger | Description |
| ------- | ----------- |
| CONTEXT_MENU_TRIGGER | trigger to add an action to a panel's context menu or hover action menu. Only actions listed in QUICK_ACTION_IDS are displayed in hover action menu. |
| PANEL_BADGE_TRIGGER | trigger to add a badge to a panel's title bar |
| PANEL_NOTIFICATION_TRIGGER | trigger to add a notification to the top-right corner of a panel |

The embeddable panel passes the embeddable API to UiActions. Each UiAction uses its `isCompatable` method to exclude embeddable API's that do not implement the required shared interfaces. An action is not displayed when `isCompatable` returns false.

The table below lists the UiActions registered to embeddable panel triggers.

| UiAction | Description | Trigger | Optional interfaces required by action |
| ---------| ----------- | ---------- | ---------- |
| saveToLibrary | Converts by-value panel to by-reference panel and stores panel configuration to library | CONTEXT_MENU_TRIGGER | HasLibraryTransforms |
| clonePanel | Clones panel in page | CONTEXT_MENU_TRIGGER | |
| copyToDashboard | Opens "copy to dashboard" modal | CONTEXT_MENU_TRIGGER | |
| ACTION_CUSTOMIZE_PANEL | Opens panel settings flyout | CONTEXT_MENU_TRIGGER | PublishesDataViews, PublishesDescription, PublishesWritableDescription, PublishesTitle, PublishesWritableTitle, PublishesTimeRange, PublishesWritableTimeRange |
| ACTION_INPUT_CONTROL_DEPRECATION_BADGE | Displays deprecation badge for Visualize embeddable input controls | PANEL_BADGE_TRIGGER | HasVisualizeConfig |
| ACTION_EDIT_IN_LENS | Opens Visualize embeddable in lens editor | CONTEXT_MENU_TRIGGER | HasVisualizeConfig |
| editPanel | Opens embeddable editor | CONTEXT_MENU_TRIGGER | HasEditCapabilities |
| togglePanel | Expands panel so page only displays single panel | CONTEXT_MENU_TRIGGER | |
| ACTION_EXPLORE_DATA | Explore underlying data | CONTEXT_MENU_TRIGGER | PublishesDataViews |
| ACTION_EXPORT_CSV | Exports raw data table to CSV | CONTEXT_MENU_TRIGGER | HasInspectorAdapters |
| openInspector | Opens inspector flyout | CONTEXT_MENU_TRIGGER | HasInspectorAdapters |
| ACTION_OPEN_IN_DISCOVER | Opens Discover application with  Lens embeddable data request context | CONTEXT_MENU_TRIGGER | LensApiCallbacks |
| deletePanel | Removes embeddable from page | CONTEXT_MENU_TRIGGER | |
| ACTION_SHOW_CONFIG_PANEL | Opens read-only view of embeddable configuration | CONTEXT_MENU_TRIGGER | HasReadOnlyCapabilities |
| unlinkFromLibrary | Converts by-reference panel to by-value panel | CONTEXT_MENU_TRIGGER | HasLibraryTransforms |
| ACTION_VIEW_SAVED_SEARCH | Open in Discover session in Discover application | CONTEXT_MENU_TRIGGER | |
| embeddable_addToExistingCase | Add to case | CONTEXT_MENU_TRIGGER | LensApiCallbacks |
| alertRule | Create an alert rule from panel | CONTEXT_MENU_TRIGGER | |
| ACTION_FILTERS_NOTIFICATION | Displays filters notification badge | PANEL_NOTIFICATION_TRIGGER | Partial<PublishesUnifiedSearch> |
| CONVERT_LEGACY_MARKDOWN | Converts markdown visualize panel to markdown panel | CONTEXT_MENU_TRIGGER | HasVisualizeConfig | 
| create-ml-ad-job-action | Detect anomalies | CONTEXT_MENU_TRIGGER |  |
| FILTER_BY_MAP_EXTENT | Filters page by map bounds | CONTEXT_MENU_TRIGGER | |
| generateCsvReport | Starts CSV reporting job for Discover session | CONTEXT_MENU_TRIGGER | PublishesSavedSearch, PublishesTitle |
| open-change-point-in-ml-app | Open change point chart embeddable in AIOps Labs | CONTEXT_MENU_TRIGGER | |
| open-in-anomaly-explorer | Open in Anomaly Explorer | CONTEXT_MENU_TRIGGER | |
| open-in-single-metric-viewer | Open in Single Metric Viewer | CONTEXT_MENU_TRIGGER | |
| CUSTOM_TIME_RANGE_BADGE | Displays custom time range badge | PANEL_BADGE_TRIGGER | PublishesTimeRange |
| OPEN_FLYOUT_ADD_DRILLDOWN | Create drilldown | CONTEXT_MENU_TRIGGER | HasDynamicActions, HasSupportedTriggers |
| OPEN_FLYOUT_EDIT_DRILLDOWN | Edit drilldown | CONTEXT_MENU_TRIGGER | HasDynamicActions, HasSupportedTriggers |
| SYNCHRONIZE_MOVEMENT_ACTION | Synchronize maps, so that if you zoom and pan in one map, the movement is reflected in other maps | CONTEXT_MENU_TRIGGER | |
| URL_DRILLDOWN | Go to URL | CONTEXT_MENU_TRIGGER | |

### Best practices

#### Do not use Embeddables to share Components between plugins
Only create an embeddable if your Component is rendered on a page that persists embeddable state and renders multiple embeddable types. For example, create an embeddable to render your Component on a Dashboard. Otherwise, use a vanilla React Component to share Components between plugins. 

#### Do not use Embeddables to avoid circular plugin dependencies
Break your Component into a Package or another plugin to avoid circular plugin dependencies.

#### Minimal API surface area
Embeddable APIs are accessable to all Kibana systems and all embeddable siblings and parents. Functions and state that are internal to an embeddable including any child components should not be added to the API. Consider passing internal state to child as props or react context.

#### Error handling
Embeddables should never throw. Instead, use [PublishesBlockingError](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/presentation/presentation_publishing/interfaces/publishes_blocking_error.ts) interface to surface unrecoverable errors. When an embeddable publishes a blocking error, the parent component will display an error component instead of the embeddable Component. Be thoughtful about which errors are surfaced with the PublishesBlockingError interface. If the embeddable can still render, use less invasive error handling such as a warning toast or notifications in the embeddable Component UI.

### Examples 
Examples available at [/examples/embeddable_examples](https://github.com/elastic/kibana/tree/main/examples/embeddable_examples)

Run examples with `yarn start --run-examples`

#### Embeddable factory examples
Use the following examples to learn how to create new Embeddable types. To access new Embeddable types, create a new dashboard, click "Add panel" and finally select "Embeddable examples".

- [Register a new embeddable type](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/search/register_search_embeddable.ts)
- [Create an embeddable that responds to Unified search](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/search/search_react_embeddable.tsx)
- [Create an embeddable that interacts with sibling embeddables](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/data_table/data_table_react_embeddable.tsx)
- [Create an embeddable that can be by value or by reference](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/saved_book/saved_book_react_embeddable.tsx)

#### Rendering embeddable examples
Use the following examples to render embeddables in your application. To run embeddable examples, navigate to `http://localhost:5601/app/embeddablesApp`

- [Render a single embeddable](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/search/search_embeddable_renderer.tsx)
- [Embeddable state management](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/app/state_management_example/state_management_example.tsx)
- [Create a dashboard like application that renders many embeddables and allows users to add and remove embeddables](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/app/presentation_container_example/components/presentation_container_example.tsx)


## Server
Containers, such as Dashboard, incorporate embeddable state in REST APIs and store embeddable state in saved objects.

### REST APIs considerations
Embeddable serialized state requires additional restrictions and planning since it is incorporated into public REST APIs.

#### No breaking changes
Embeddable serialized state can not be modified with breaking changes. Fields can not be deleted or change type. Optional fields can not be changed to required. Optional additive changes are allowed.

#### snake_case
Kibana's REST APIs require snake_case. Therefore, embeddable serialized state must be in snake_case.

#### Minimize required fields
Avoid unnecessary information to keep public REST APIs concise. Do not store duplicate information. Derived fields can be created in public when initializing an embeddable. Where possible, avoid a required field by specifying a default.

#### Apply defaults in your schema
POST, PUT, and GET requests should return complete data. Apply defaults in your embeddable schemas by using the `defaultValue` key. Any key that has a `defaultValue` must not be wrapped
in a `schema.maybe`, as this will cause the defaults not to be applied at validation time.

### Transforms
Transforms decouple REST API state from stored state, allowing embeddables to have one shape for REST APIs and another for storage.
- On read, transformOut is used to convert StoredEmbeddableState and inject references into EmbeddableState.
- On write, transformIn is used to extract references and convert EmbeddableState into StoredEmbeddableState.

**Note:** Transforms are optional and only required when an embeddable has references or a container has stored legacy embeddable state that needs to converted into new schema defined shape.

Containers use schemas to
- Include embeddable state schemas in OpenAPI Specification (OAS) documenation.
- Validate embeddable state, failing REST API requests when schema validation fails.

```
embeddableServerSetup.registerTransforms(
  'myEmbeddableType',
  {
    getTransforms: (drilldownTransfroms) => ({
      transformIn: (state: EmbeddableState) => {
        return {
          state: convertToStoredState(state),
          references: extractReferences(state)
        };
      },
      transformOut: (state: StoredEmbeddableState, references?: Reference[]): EmbeddableState => {
        return convertAndInjectReferences(state, references);
      },
    }),
    getSchema: (getDrilldownsSchema) => schema: schema.object({
      required_field: schema.string(),
      optional_field: schema.maybe(schema.string()),
    })
  }
});
```
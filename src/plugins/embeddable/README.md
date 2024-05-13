Embeddables are React components that manage their own state, can be serialized and deserialized, and return an API that can be used to interact with them imperatively.

#### Guiding principles
* **Coupled to React:** Kibana is a React application, and the minimum unit of sharing is the React component. Embeddables enforce this by requiring a React component.
* **Composition over inheritence:** Rather than an inheritance-based system with classes, imperative APIs are plain old typescript objects that implement any number of shared interfaces. Interfaces are enforced via type guards and are shared via Packages.
* **Internal state management:** Each embeddable manages its own state. This is because the embeddable system allows a page to render a registry of embeddable types that can change over time. This makes it untenable for a single page to manage state for every type of embeddable. The page is only responsible for persisting and providing the last persisted state to the embeddable on startup.

#### Best practices
* **Do not use Embeddables to share Components between plugins: ** Only create an embeddable if your Component is rendered on a page that persists embeddable state and renders multiple embeddable types. For example, create an embeddable to render your Component on a Dashboard. Otherwise, use a vanilla React Component to share Components between plugins. 
* **Do not use Embeddables to avoid circular plugin dependencies: ** Avoid using embeddables to work around circular plugin dependencies. Instead, break your Component into a Package or another plugin.
* **Minimal API surface area: ** Embeddable APIs are accessable to all Kibana systems and all embeddable siblings and parents. Functions and state that are internal to an embeddable including any child components should not be added to the API. Consider passing internal state to child as props or react context.

#### Examples
Examples available at [/examples/embeddable_examples](https://github.com/elastic/kibana/tree/main/examples/embeddable_examples)
Run examples with `yarn start --run-examples`
Navigate to `http://localhost:5601/app/embeddablesApp`
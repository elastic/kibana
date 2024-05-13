Embeddables are React components that manage their own state, can be serialized and deserialized, and return an API that can be used to interact with them imperatively.

### Guiding principles
* **Coupled to React:** Kibana is a React application, and the minimum unit of sharing is the React component. Embeddables enforce this by requiring a React component.
* **Composition over inheritence:** Rather than an inheritance-based system with classes, imperative APIs are plain old typescript objects that implement any number of shared interfaces. Interfaces are enforced via type guards and are shared via Packages.
* **Internal state management:** 

### Best practices
* **Do not use Embeddables to share Components between plugins: **
* **Do not use Embeddables to avoid circular plugin dependencies: **
* **Minimal API surface area: **

### Developer docs and examples
Access developer docs and examples by running `yarn start --run-examples`.
Navigate to `http://localhost:5601/app/embeddablesApp`.
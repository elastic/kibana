# Project Navigation Service

This service manages the side navigation's state using a decoupled, plugin-based architecture.

## Architecture at a Glance

-   **Plugins for Stateful Deployment**: Register navigation trees via the `addSolutionNavigation` service from `@kbn/shared-navigation-plugin`.
-   **Serverless Plugins**: Register navigation trees via the `initNavigation` method from the serverless plugin's start contract.
-   **`ProjectNavigationService`**: Manages the source-of-truth nav state and logic.
-   **`ChromeService`**: Orchestrates the UI and bridges the service layer with React.

## Data Flow

The following diagram illustrates how navigation state flows through the system using reactive streams (RxJS observables):

```
+----------------------------+
| ProjectNavigationService   |
|                            |
|  +---------------------+   |
|  | navigationTree$     |---+----+  Register navigation tree
|  +---------------------+   |    |
|                            |    |
|  +---------------------+   |    |     +-----------------+
|  | activeNodes$        |---+----+---->| ChromeService   |
|  +---------------------+   |    |     |                 |
|                            |    |     |  +-----------+  |
+----------------------------+    +---->|  | navLinks$ |  |
                                        |  +-----------+  |
                                        |                 |
                                        |  +-----------+  |
                                        |  | collapsed$|  |
                                        |  +-----------+  |
                                        |                 |
                                        +--------+--------+
                                                 |
                                                 | NavigationKibanaProvider
                                                 | adapts streams
                                                 v
                                        +------------------+
                                        | NavigationProvider|
                                        |                  |
                                        |  +-----------+   |
                                        |  | Context   |   |
                                        |  +-----------+   |
                                        |                  |
                                        +--------+--------+
                                                 |
                                                 | useNavigation() hook
                                                 | consumes context
                                                 v
                                        +------------------+
                                        | Navigation       |
                                        | Component        |
                                        |                  |
                                        | - Renders UI     |
                                        | - Highlights     |
                                        |   active items   |
                                        | - Shows          |
                                        |   breadcrumbs    |
                                        +------------------+
```

## Core Functions

This service has three primary responsibilities:

### 1. Consuming Navigation Components

The service does not contain any UI. Instead, it processes navigation trees registered by plugins. This allows the navigation to be extended and customized by different parts of Kibana.

-   **Plugins for Stateful Deployment**: Register navigation trees via the `addSolutionNavigation` service from `@kbn/shared-navigation-plugin`.
-   **Serverless Plugins**: Register navigation trees via the `initNavigation` method from the serverless plugin's start contract.

-   **How it works**: Plugins register their components, and the `ChromeService` selects the appropriate one to render based on the current context.

### 2. Tracking Active State

This is the most common function of the service. It determines the currently active link and broadcasts it to the UI.

-   **State Stream**: The active state is exposed as an RxJS observable, `activeNodes$`, which streams the active link and its parent breadcrumbs.
-   **UI Consumption**: The `ChromeService` subscribes to this stream using the `useObservable` hook and passes the static result to the React UI as a prop.
-   **Detection Algorithm**: The active node is found by the `findActiveNodes` utility, which uses two methods:
    1.  **Custom Logic (`getIsActive`)**: A node can define its own function for complex activation logic.
    2.  **Longest URL Match**: As a fallback, the utility finds the most specific link by matching the longest URL prefix.

#### Breadcrumbs Generation

Breadcrumbs are automatically generated from the navigation tree structure:

1. When an active node is identified, the service traverses up the tree to find all parent nodes
2. These parent nodes, along with the active node, form the breadcrumb trail
3. Each node in the breadcrumb trail contains its title, href, and other metadata
4. The `activeNodes$` observable emits this entire trail, allowing UI components to render breadcrumbs

#### Active Item Highlighting

UI components use the `activeNodes$` observable to highlight the currently active navigation item:

1. The `SideNavComponent` subscribes to `activeNodes$` to determine which items to highlight
2. When rendering the navigation tree, each item compares its ID with the active node's ID
3. If they match, the item is rendered with an "active" state (different styling)
4. Parent nodes of the active item may also receive special styling to show the active path

### 3. Managing Solution Navigation

The service also manages the top-level navigation structure for different **Solutions** (major sections of Kibana like Observability or Security).

-   **What it is**: This allows for entirely different navigation trees to be swapped out.
-   **Key Methods**:
    -   `changeActiveSolutionNavigation()`: Swaps the active solution.
    -   `getNavState$()`: Provides a combined observable with all relevant nav state (active nodes, breadcrumbs, etc.).
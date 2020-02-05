# Discover Context App Implementation Notes

The implementation of this app is intended to exhibit certain desirable
properties by adhering to a set of *principles*. This document aims to explain
those and the *concepts* employed to achieve that.


## Principles

**Single Source of Truth**: A good user experience depends on the UI displaying
consistent information across the whole page. To achieve this, there should
always be a single source of truth for the application's state. In this
application this is the `ContextAppController::state` object.

**Unidirectional Data Flow**: While a single state promotes rendering
consistency, it does little to make the state changes easier to reason about.
To avoid having state mutations scattered all over the code, this app
implements a unidirectional data flow architecture. That means that the state
is treated as immutable throughout the application except for actions, which
may modify it to cause angular to re-render and watches to trigger.

**Unit-Testability**: Creating unit tests for large parts of the UI code is
made easy by expressing the as much of the logic as possible as
side-effect-free functions. The only place where side-effects are allowed are
actions. Due to the nature of AngularJS a certain amount of impure code must be
employed in some cases, e.g. when dealing with the isolate scope bindings in
`ContextAppController`.

**Loose Coupling**: An attempt was made to couple the parts that make up this
app as loosely as possible. This means using pure functions whenever possible
and isolating the angular directives diligently. To that end, the app has been
implemented as the independent `ContextApp` directive in [app.js](app.js). It
does not access the Kibana `AppState` directly but communicates only via its
directive properties. The binding of these attributes to the state and thereby
to the route is performed by the `CreateAppRouteController`in
[index.js](index.js). Similarly, the `SizePicker` directive only communicates
with its parent via the passed properties.


## Concepts

To adhere to the principles mentioned above, this app borrows some concepts
from the redux architecture that forms a ciruclar unidirectional data flow:

```

     |* create initial state
     v
  +->+
  |  v
  |  |* state
  |  v
  |  |* angular templates render state
  |  v
  |  |* angular calls actions in response to user action/system events
  |  v
  |  |* actions modify state
  |  v
  +--+

```

**State**: The state is the single source of truth at
`ContextAppController::state` and may only be modified by actions.

**Action**: Actions are functions that are called in response to user or system
actions and may modified the state the are bound to via their closure.


## Directory Structure

**index.js**: Defines the route and renders the `<context-app>` directive,
binding it to the `AppState`.

**app.js**: Defines the `<context-app>` directive, that is at the root of the
application. Creates the store, reducer and bound actions/selectors.

**query**: Exports the actions, reducers and selectors related to the
query status and results.

**query_parameters**: Exports the actions, reducers and selectors related to
the parameters used to construct the query.

**components/action_bar**: Defines the `<context-action-bar>`
directive including its respective styles.


**api/anchor.js**: Exports `fetchAnchor()` that creates and executes the
query for the anchor document.

**api/context.js**: Exports `fetchPredecessors()`, `fetchSuccessors()`, `fetchSurroundingDocs()` that
create and execute the queries for the preceeding and succeeding documents.

**api/utils**: Exports various functions used to create and transform
queries.

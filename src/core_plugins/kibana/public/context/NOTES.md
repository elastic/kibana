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
is treated as immutable throughout the application and a new state may only be
derived via the root reducer (see below).

**Unit-Testability**: Creating unit tests for large parts of the UI code is
made easy by expressing the state management logic mostly as side-effect-free
functions. The only place where side-effects are allowed are action creators
and the reducer middlewares. Due to the nature of AngularJS a certain amount of
impure code must be employed in some cases, e.g. when dealing with the isolate
scope bindings in `ContextAppController`.

**Loose Coupling**: An attempt was made to couple the parts that make up this
app as loosely as possible. This means using pure functions whenever possible
and isolating the angular directives diligently. To that end, the app has been
implemented as the independent `ContextApp` directive in [app.js](./app.js). It
does not access the Kibana `AppState` directly but communicates only via its
directive properties. The binding of these attributes to the state and thereby
to the route is performed by the `CreateAppRouteController`in
[index.js](./index.js). Similarly, the `SizePicker` directive only communicates
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
  |  |* selectors calculate derived (memoized) values
  |  v
  |  |* angular templates render values
  |  v
  |  |* angular dispatches actions in response to user action/system events
  |  v
  |  |* middleware processes the action
  |  v
  |  |* reducer derives new state from action
  |  v
  +--+

```

**State**: The state is the single source of truth at
`ContextAppController::state` and may only be replaced by a new state create
via the root reducer.

**Reducer**: The reducer at `ContextAppController.reducer` can derive a new
state from the previous state and an action. It must be a pure function and can
be composed from sub-reducers using various utilities like
`createReducerPipeline`, that passes the action and the previous sub-reducer's
result to each sub-reducer in order. The reducer is only called by the dispatch
function located at `ContextAppController::dispatch`.

**Action**: Actions are objets that describe user or system actions in a
declarative manner. Each action is supposed to be passed to
`ContextAppController::dispatch`, that passes them to each of its middlewares
in turn before calling the root reducer with the final action. Usually, actions
are created using helper functions called action creators to ensure they adhere
to the [Flux Standard Action] schema.

[Flux Standard Action]: https://github.com/acdlite/flux-standard-action

**Selector**: To decouple the view from the specific state structure, selectors
encapsulate the knowledge about how to retrieve a particular set of values from
the state in a single location. Additionally, selectors can encapsulate the
logic for calculating derived properties from the state, which should be kept
as flat as possible and free of duplicate information. The performance penalty
for performing these calculations at query time is commonly circumvented by
memoizing the selector results as is the case with `createSelector` from
[redux_lite/selector_helpers.js](./redux_lite/selector_helpers.js).

# @kbn/xstate-utils

Utilities to assist with development using the xstate library.

## withMemoizedSelectors

Add reselect selectors to an xstate machine react context.
In most cases, the actor and state machine model of xstate is great, but for derived data using pure functions, the semantics of the `useMemo` hook with defined dependencies is often easier to understand and eliminates the risk of forgetting to update the derived data correctly in some cases.

This is what `withMemoizedSelectors` allows:
```ts
const myActorContext = withMemoizedSelectors(
  createActorContext(myMachine),
  {
    derivedView: createSelector(
      [
        (ctx: MyContextType) => {
          return ctx.dependency1;
        },
        (ctx: MyContextType) =>
          ctx.dependency2,
      ],
      (dependency1, dependency2) => {
        return // expensive calculation only running when necessary
      }
    ),
  },
  (context) => (context.subMachine ? [context.subMachine] : []) // optionally subscribe to changes of submachines as well
);


// in react use useMemoizedSelector hook
// this will cause the component to rerender if the selector is returning a new value
myActorContext.useMemoizedSelector('derivedView')
```

This helper should be used in cases where a react component requires access to some values in the context, but represented differently - e.g. if the context has `{ todos: Todo[]; filter: 'active' | 'all' }`, then the `TodoList` component requires the list of currently visible todo items. This can't be solved via the regular `actorContext.useSelector` hook, because it would generate a new array of visible todo items on every single state update of the machine, even if the todo items or the filter don't change, causing unnecessary calculations and rerenders.

If you preserve the reference in your selector function (e.g. just returning all todos via `context.todos`), it's recommended to use `actorContext.useSelector` instead.
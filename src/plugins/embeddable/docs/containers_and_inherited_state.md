## Common mistakes with embeddable containers and inherited input state

`updateInput` is typed as `updateInput(input: Partial<EmbeddableInput>)`. Notice it's _partial_. This is to support the use case of inherited state when an embeddable is inside a container.

If you are simply rendering an embeddable, it's no problem to do something like:

```ts
// Notice this isn't a partial so it'll be the entire state.
const input: EmbeddableInput = this.state.input
embeddable.updateInput(input);
```

However when you are dealing with _containers_, you want to be sure to **only pass into `updateInput` the actual state that changed**. This is because calling `child.updateInput({ foo })` will make `foo` _explicit_ state. It cannot be inherited from it's parent.

For example, on a dashboard, the time range is _inherited_ by all children, _unless_ they had their time range set explicitly. This is how "per panel time range" works. That action calls `embeddable.updateInput({ timeRange })`, and the time range will no longer be inherited from the container.

### Why is this important?

A common mistake is always passing in the full state. If you do this, all of a sudden you will lose the inheritance of the container state.

**Don't do**

```ts
// Doing this will make it so this embeddable inherits _nothing_ from its container. No more time range updates
// when the user updates the dashboard time range!
embeddable.updateInput({ ...embeddable.getInput(), foo: 'bar' });
```

**Do**

```ts
embeddable.updateInput({ foo: 'bar' });
```

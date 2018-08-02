# Cancelable

A small, relatively simple mechanism for providing cancelable promises. This allows plugins / packages to provide cancelable promises without having to pull in heavier or more complex 3rd party solutions.

## Usage

The `cancellable` function is passed any number of functions, each of which is expected to return a promise (which itself can be optionally cancelable). The cancelable function calls each function sequentially, waiting for the resulting promise to resolve, then passing the result of that resolve as the argument to the next function in the sequence.

If any function in the sequence rejects rather than resolves, this short-circuits the chain, and the entire promise will reject.

If `cancel` is called on the promise, the remaining function calls will not be made, and the original promise returned by `cancelable` will be rejected with an error that looks like this:

```js
{
  status: 'cancelled',
  runCount: 2, // How many promises resolved prior to cancellation
  message: 'Promise cancelled.'
}
```

```js
import { cancelable } from '@kbn/cancelable';

// This promise will resolve to `{ a: 'a', b: 'B!!', c: 'C!!!' }`, unless
// myPromise.cancel is called prior to the execution of the last function.
const myPromise = cancelable(
  () => wait(1000).then(() => ({ a: 'a' })),
  context => wait(1500).then(() => ({ ...context, b: 'B!!' })),
  context => wait(2000).then(() => ({ ...context, c: 'C!!!' }))
);

// Just here to simulate some long-running work / promises
async function wait(ms) {
  console.log(`Waiting ${ms}ms`);
  await new Promise(r => setTimeout(r, ms));
}
```

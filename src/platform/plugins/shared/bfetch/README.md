# `bfetch` plugin

`bfetch` allows to batch HTTP requests and streams responses back.


# Example

We will create a batch processing endpoint that receives a number then doubles it
and streams it back. We will also consider the number to be time in milliseconds
and before streaming the number back the server will wait for the specified number of
milliseconds.

To do that, first create server-side batch processing route using [`addBatchProcessingRoute`](./docs/server/reference.md#addBatchProcessingRoute).

```ts
plugins.bfetch.addBatchProcessingRoute<{ num: number }, { num: number }>(
  '/my-plugin/double',
  () => ({
    onBatchItem: async ({ num }) => {
      // Validate inputs.
      if (num < 0) throw new Error('Invalid number');
      // Wait number of specified milliseconds.
      await new Promise(r => setTimeout(r, num));
      // Double the number and send it back.
      return { num: 2 * num };
    },
  })
);
```

Now on client-side create `double` function using [`batchedFunction`](./docs/browser/reference.md#batchedFunction).
The newly created `double` function can be called many times and it
will package individual calls into batches and send them to the server.

```ts
const double = plugins.bfetch.batchedFunction<{ num: number }, { num: number }>({
  url: '/my-plugin/double',
});
```

Note: the created `double` must accept a single object argument (`{ num: number }` in this case)
and it will return a promise that resolves into an object, too (also `{ num: number }` in this case).

Use the `double` function.

```ts
double({ num: 1 }).then(console.log, console.error); // { num: 2 }
double({ num: 2 }).then(console.log, console.error); // { num: 4 }
double({ num: 3 }).then(console.log, console.error); // { num: 6 }
```


## Reference

- [Browser](./docs/browser/reference.md)
- [Server](./docs/server/reference.md)

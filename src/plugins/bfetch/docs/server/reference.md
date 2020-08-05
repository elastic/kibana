# `bfetch` server reference

- [`addBatchProcessingRoute`](#addBatchProcessingRoute)
- [`addStreamingResponseRoute`](#addStreamingResponseRoute)


## `addBatchProcessingRoute`

Sets up a server endpoint that expects to work with [`batchedFunction`](../browser/reference.md#batchedFunction).
The endpoint receives a batch of requests, processes each request and streams results
back immediately as they become available. You only need to implement the
processing of each request (`onBatchItem` function), everything else is handled.

`onBatchItem` function is called for each individual request in the batch.
`onBatchItem` function receives a single object argument which is the payload
of one request; and it must return a promise that resolves to an object, too.
`onBatchItem` function is allowed to throw, in that case the error will be forwarded
to the browser only to the individual request, the rest of the batch will still continue
executing.

```ts
plugins.bfetch.addBatchProcessingRoute<object, object>(
  '/my-plugin/double',
  request => ({
    onBatchItem: async (payload) => {
      // ...
      return {};
    },
  })
);
```

`request` is the `KibanaRequest` object. `addBatchProcessingRoute` together with `batchedFunction`
ensure that errors are handled and that all items in the batch get executed.


## `addStreamingResponseRoute`

`addStreamingResponseRoute` is a lower-level interface that receives and `payload`
message returns and observable which results are streamed back as ND-JSON messages
until the observable completes. `addStreamingResponseRoute` does not know about the
type of the messages, it does not handle errors, and it does not have a concept of
batch size&mdash;observable can stream any number of messages until it completes.

```ts
plugins.bfetch.addStreamingResponseRoute('/my-plugin/foo', request => ({
  getResponseStream: (payload) => {
    const subject = new Subject();
    setTimeout(() => { subject.next('123'); }, 100);
    setTimeout(() => { subject.complete(); }, 200);
    return subject;
  },
}));
```

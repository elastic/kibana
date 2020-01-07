# `bfetch` server reference

- [`addBatchProcessingRoute`](#addBatchProcessingRoute)
- [`addStreamingResponseRoute`](#addStreamingResponseRoute)


## `addBatchProcessingRoute`

Creates a function that will buffer its calls (until timeout&mdash;10ms default&mdash; or capacity reached&mdash;25 default)
and send all calls in one batch to the specified endpoint. The endpoint is expected
to stream results back in ND-JSON format using `Transfer-Encoding: chunked`, which is
implemented by `addBatchProcessingRoute` server-side method of `bfetch` plugin.

The created function is expected to be called with a single object argument and will
return a promise that will resolve to an object.

```ts
const fn = bfetch.batchedFunction({ url: '/my-plugin/something' });

const result = await fn({ foo: 'bar' });
```


## `addStreamingResponseRoute`

Executes an HTTP request and expects that server streams back results using
HTTP/1 `Transfer-Encoding: chunked`.

```ts
const { stream } = bfetch.fetchStreaming({ url: 'http://elastic.co' });

stream.subscribe(value => {});
```

# `bfetch` browser reference

- [`batchedFunction`](#batchedFunction)
- [`fetchStreaming`](#fetchStreaming)


## `batchedFunction`

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

Options:

- `url` &mdash; URL endpoint that will receive a batch of requests. This endpoint is expected
  to receive batch as a serialized JSON array. It should stream responses back
  in ND-JSON format using `Transfer-Encoding: chunked` HTTP/1 streaming.
- `fetchStreaming` &mdash; The instance of `fetchStreaming` function that will perform ND-JSON handling.
  There should be a version of this function available in setup contract of `bfetch` plugin.
- `flushOnMaxItems` &mdash; The maximum size of function call buffer before sending the batch request.
- `maxItemAge` &mdash; The maximum timeout in milliseconds of the oldest item in the batch
  before sending the batch request.


## `fetchStreaming`

Executes an HTTP request and expects that server streams back results using
HTTP/1 `Transfer-Encoding: chunked`.

```ts
const { stream } = bfetch.fetchStreaming({ url: 'http://elastic.co' });

stream.subscribe(value => {});
```

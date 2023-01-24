## response stream

This plugin demonstrates how to stream chunks of data to the client with just a single request.

To run Kibana with the described examples, use `yarn start --run-examples`.

The `response_stream` plugin demonstrates API endpoints that can stream data chunks with a single request with gzip/compression support. gzip-streams get decompressed natively by browsers. The plugin demonstrates two use cases to get started: Streaming a raw string as well as a more complex example that streams Redux-like actions to the client which update React state via `useReducer()`.

Code in `@kbn/aiops-utils` contains helpers to set up a stream on the server side (`streamFactory()`) and consume it on the client side via a custom hook (`useFetchStream()`). The utilities make use of TS generics in a way that allows to have type safety for both request related options as well as the returned data.

No additional third party libraries are used in the helpers to make it work. On the server, they integrate with `Hapi` and use node's own `gzip`. On the client, the custom hook abstracts away the necessary logic to consume the stream, internally it makes use of a generator function and `useReducer()` to update React state.

On the server, the simpler stream to send a string is set up like this:

```ts
const { end, push, responseWithHeaders } = streamFactory(request.headers);
```

The request's headers get passed on to automatically identify if compression is supported by the client.

On the client, the custom hook is used like this:

```ts
const { errors, start, cancel, data, isRunning } = useFetchStream<
    ApiSimpleStringStream, typeof basePath
>(`${basePath}/internal/response_stream/simple_string_stream`);
```


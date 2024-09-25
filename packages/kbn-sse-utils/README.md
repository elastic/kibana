# @kbn/sse-utils

This package exports utility functions that can be used to format and parse server-sent events(SSE). SSE is useful when streaming data back to the browser as part of a long-running process, such as LLM-based inference. It can convert an Observable that emits values of type `ServerSentEvent` into a response stream on the server, emitting lines in an SSE-compatible format, and it can convert an SSE response stream back into deserialized event.

## Server

On the server, you can use `observableIntoEventSourceStream` to convert an Observable that emits `ServerSentEvent` values into a Node.js response stream:

```ts
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';

function myRequestHandler(
  context: RequestHandlerContext,
  request: KibanaRequest,
  response: KibanaResponseFactory
) {
  return response.ok({
    body: observableIntoEventSourceStream(
      of({
        type: 'my_event_type',
        data: {
          anyData: {},
        },
      })
    ),
  });
}
```

All emitted values have to be of `ServerSentEvent` type:

```ts
type ServerSentEvent = {
  type: string;
  data: Record<string, any>;
};
```

Any error that occurs in the Observable is written to the stream as an event, and the stream is closed.

## Client

On the client, you can use `http `@elastic/core-http-browser` to convert the stream of events back into an Observable:

```ts
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
function streamEvents(http: Http) {
  from(
    http.post('/internal/my_event_stream', {
      asResponse: true,
      rawResponse: true,
    })
  ).pipe(httpResponseIntoObservable());
}
```

Any serialized error events from the stream are de-serialized, and thrown as an error in the Observable.

# Pub/sub example

Server-only example of the in-process pub/sub service. It is loaded with `yarn start --run-examples`.

The plugin registers topic `pubsubExample.ping` and two consumers. `echo` subscribes to the `default` namespace and logs the publisher request id when one was passed. `length` subscribes to `*` and logs the message length for every namespace.

`POST /internal/pubsub_example/publish` with `{ "message": "hello" }` publishes one event. Send headers `elastic-api-version: 1`, `kbn-xsrf: kibana`, and `x-elastic-internal-origin: Kibana`. A timer publishes another event every 30 seconds. Watch the Kibana server log.

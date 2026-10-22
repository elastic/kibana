# Pub/sub example

Server-only example of the in-process pub/sub service. It is loaded with `yarn start --run-examples`.

The plugin registers topic `pubsubExample.ping` and two consumers. `echo` logs the source and message. `length` logs the message length. Every consumer receives every event published on the topic.

`POST /internal/pubsub_example/publish` with `{ "idempotencyKey": "hello-1", "message": "hello" }` publishes one event. The key becomes the event id, so retrying the same call publishes the same id. Send headers `elastic-api-version: 1`, `kbn-xsrf: kibana`, and `x-elastic-internal-origin: Kibana`. A timer publishes another event every 30 seconds. Watch the Kibana server log.

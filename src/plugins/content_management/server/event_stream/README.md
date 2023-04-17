# Event Stream


## The service

On a high-level the Event Stream is exposed through the `EventStreamService`
class, which is the public interface to the Event Stream, it holds any necessary
state, and follows plugin life-cycle methods.

The service also validates the events before they are stored. It also buffers
the events on write. Events are buffered for 250ms or up to 100 events before
they are flushed to the storage.


## The client

On a lower level the actual event storage is defined in the `EventStreamClient`
interface. There are two `EventStreamClient` implementations:

- `EsEventStreamClient` is the production implementation, which stores events
  to the Elasticsearch.
- `MemoryEventStreamClient` is used for testing and could be used for demo
  purposes.


### The `EsEventStreamClient` client

`EsEventStreamClient` is used in production. It stores events in the
`.kibana-event-stream` data stream. The data stream and index template are
created during plugin initialization "start" life-cycle.

The mappings define `meta` and `indexed` fields, which are reserved for future
schema extensions (so that new fields can be added without mapping changes).

The mappings also define a transaction ID (`txID`) field, which can be used to
correlate multiple related events together or to store the transaction ID.

Events are written to Elasticsearch using the `_bulk` request API.


## Testing

The `MemoryEventStreamClient` can be used to simulate the Event Stream in Jest
unit test environment. Use `setupEventStreamService()` to spin up the service
in the test environment.

The clients themselves can be tested using the `testEventStreamClient` test
suite, which should help with verifying that both implements work correctly.
The `EsEventStreamClient` it is tested using Kibana integration tests, but for
`MemoryEventStreamClient` it is tested as a Jest tests.

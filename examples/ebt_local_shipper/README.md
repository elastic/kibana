## EBT local shipper

This example plugin registers a local shipper that indexes all the EBT events in the local Elasticsearch.
The intention is to make it easier for developers to explore their events without having to wait for our _long_ ingestion pipelines. 

The target indices are:
- `ebt-kibana-browser` for all events generated in the browser
- `ebt-kibana-server` for all events generated in the server

### `properties` is `flattened`, that doesn't help...

The mappings set `properties` as `flattened` type only to make it more dynamic, and to avoid mapping conflicts if 2 events
report different types under the same property name. For your local tests, it should be enough to create a runtime mapping 
in your data view. If the runtime mapping's name matches the actual path (`properties.my_cool_property`), it's almost the same 
as adding it to the mappings in terms of usability. No need to define any painless script: just the name and the type, _et voilà_. 

To run this example, use the command `yarn start --run-examples`.

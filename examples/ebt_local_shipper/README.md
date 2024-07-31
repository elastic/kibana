## EBT local shipper

This example plugin registers a local shipper that indexes all the EBT events in the local Elasticsearch.
The intention is to make it easier for developers to explore their events without having to wait for our _long_ ingestion pipelines. 

The target indices are:
- `ebt-kibana-browser` for all events generated in the browser
- `ebt-kibana-server` for all events generated in the server

To run this example, use the command `yarn start --run-examples`.

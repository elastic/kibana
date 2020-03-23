# Kibana Telemetry Service

Telemetry allows Kibana features to have usage tracked in the wild. The general term "telemetry" refers to multiple things:

1. Integrating with the telemetry service to express how to collect usage data (Collecting).
2. Sending a payload of usage data up to Elastic's telemetry cluster.
3. Viewing usage data in the Kibana instance of the telemetry cluster (Viewing).

This plugin is responsible for sending usage data to the telemetry cluster. For collecting usage data, use 

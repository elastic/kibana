# `@kbn/analytics`

> [!NOTE]  
> The term _analytics_ here refers to _Usage Analytics_, and should not be confused with the Kibana (Data) Analytics tools.

> [!IMPORTANT]   
> This package is exclusively used by the plugin `usage_collection` and it's not expected to be used elsewhere.
> If you are still here for _Usage Analytics_, you might be looking for [core-analytics](../core/analytics), the [EBT packages](../analytics).

This package implements the report that batches updates from Application Usage, UI Counters, and User Agent. 
It defines the contract of the report, and the strategy to ship it to the server.


# search

The `search` plugin provides the ability to register search strategies that take in a request
object, and return a response object, of a given shape.

Both client side search strategies can be registered, as well as server side search strategies.

The `search` plugin includes two one concrete client side implementations - 
 `SYNC_SEARCH_STRATEGY` and `ES_SEARCH_STRATEGY` which uses `SYNC_SEARCH_STRATEGY`.  There is also one
 default server side search strategy, `ES_SEARCH_STRATEGY`.

 Includes the `esSearch` plugin in order to search for data from Elasticsearch using Elasticsearch
DSL.

# search

The `search` plugin provides the ability to register search strategies that take in a request
object, and return a response object, of a given shape.

Both client side search strategies can be registered, as well as server side search strategies.

The `search` plugin includes:

- ES_SEARCH_STRATEGY - hitting regular es `_search` endpoint using query DSL
- (default) ESE_SEARCH_STRATEGY (Enhanced ES) - hitting `_async_search` endpoint and works with search sessions
- EQL_SEARCH_STRATEGY
- SQL_SEARCH_STRATEGY

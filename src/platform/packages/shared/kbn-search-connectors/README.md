# @kbn/search-connectors

`@kbn/search-connectors` exports connector data, types, and utilities for browser
and server code. Browser components are exported separately from
`@kbn/search-connectors-ui` so importing connector utilities on the server does
not load EUI or the component tree during startup.

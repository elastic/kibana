---
description: An introduction to the Kibana server and core components.
---

# Kibana Server and Core components

Core is a set of systems (frontend, backend etc.) that Kibana and its plugins are built on top of.

### Logging
`core` has its own [logging system](key_concepts/audit_logging.md) and will output log records directly (e.g. to file or terminal) when configured. When no specific configuration is provided, logs are forwarded to the "legacy" Kibana so that they look the same as the rest of the
log records throughout Kibana.

*Other components — coming soon. More content on the other components offered by core will be added here.*

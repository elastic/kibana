# @kbn/core-tenants-server-internal

Tenants service. It reads the tenants file set by `tenants.file` and gives other core services what they need from it: known tenant IDs to the HTTP server, client credentials to the Elasticsearch service, and each tenant's encryption crypto (never the raw key) to saved objects.

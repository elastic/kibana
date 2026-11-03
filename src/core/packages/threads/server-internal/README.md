# @kbn/core-threads-server-internal

Core-internal worker thread primitives. Not exposed to plugins.

`createManagedWorker` spawns a single long-lived worker through a bootstrap that sets up the Kibana
Node environment (dev or distributable), waits for the worker to report ready, restarts it with
exponential backoff after crashes, and stops retrying once the restart budget is used up.

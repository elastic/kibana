# @kbn/core-threads-server-internal

Core-internal worker thread primitives. Not exposed to plugins.

`createManagedWorker` spawns a single long-lived worker through a bootstrap that sets up the Kibana
Node environment (dev or distributable), waits for the worker to report ready, and restarts it with
exponential backoff after crashes.

The backoff doubles from `restart.initialDelayMs` up to `restart.maxDelayMs` (1 minute by default).
Restarts are unlimited by default, so a failing worker keeps restarting at that cap. Set
`restart.maxAttempts` to a finite number for a worker that should become `exhausted` and stop
retrying after that many restarts.

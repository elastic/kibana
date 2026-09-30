# Core threads (internal)

`ThreadsService` provides Core services with dedicated managed workers through
`InternalThreadsStart.createWorker`. The returned handle starts and stops a worker;
Threads owns construction, lifecycle listeners, termination, reference handling
and bounded exponential-backoff restarts. Consumers supply the entry, Node worker
options, reference/restart policy and initialization/exit/exhaustion callbacks.
Consumers must stop their handles at shutdown. There is no pool, scheduling,
worker reuse, new YAML configuration or public plugin contract.

The event-loop watchdog is the first consumer. It owns heartbeat/activity tracking,
detection, profiling and rate limits, not Node worker lifecycle mechanics.

## Independent diagnostic logging

`createWorkerLogger` returns the standard `Logger` interface, using the shared
`AbstractLogger`, pattern formatter and ECS JSON conversion used by Core logging.
It writes synchronously to stdout (or an injected test descriptor), without
forwarding records through the main event loop. Worker records automatically carry
`kibana.worker.name` and `kibana.worker.thread_id` (Node's ID, not an OS thread ID).
Text output includes `[worker:<name>:<id>]`. Main-thread records have no worker marker.

This deliberately restricted sink uses a startup snapshot of logger level and
console format. It does not instantiate Core's logging system, file/rolling/rewrite
appenders, global metadata, filters or arbitrary console patterns/highlighting.
No configured console sink means no worker diagnostic output; a file-only logger
still receives main-thread lifecycle messages but not worker reports/errors.
Re-enabling the watchdog reuses the snapshot taken at service start.

Output is best-effort: formatting/write failures are contained, but synchronous
stdout can itself block under backpressure. Inspector operations may still need
the main thread to respond even though diagnostic output no longer does.

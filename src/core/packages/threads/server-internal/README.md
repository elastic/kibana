# Core threads (internal)

`ThreadsService` provides Core services with a worker creation boundary through
`InternalThreadsStart.createWorker`. It forwards the entry and options to Node's
`Worker` constructor without changing their semantics.

Consumers own messaging, reference state, error handling, restart policy and
termination, including shutdown. The event-loop watchdog is the first consumer;
its worker entry and diagnostic policies remain in metrics.

This is groundwork for future Core thread management, not a worker pool. There
is no scheduling, worker reuse, new configuration or public plugin contract.

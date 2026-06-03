# RFC: Domain Event Bus (`@kbn/domain-events`)

> A shared, in-process publish/subscribe layer for Kibana plugins. Packaged as `@kbn/domain-events`; "shared" describes its topology (one neutral instance, not a per-plugin private bus).

**Status:** Draft
**Authors:** Workflows Engine Team
**Date:** 2026-05-31

---

## Problem Statement

Plugins in Kibana increasingly need to react to things that happen in other plugins: a case was created, an alert fired, a workflow finished, a step started. Today there is **no shared, neutral place** for a plugin to announce that "something happened" and let any other plugin react to it without the two plugins knowing about each other.

Instead, every cross-plugin notification is built one of three ways, and each one couples the plugins together:

### Problem 1: Point-to-point calls couple plugins

Plugin A imports Plugin B (or a workflows client) and calls it directly. Each new integration adds an explicit dependency and sprinkles call sites through unrelated domain code. The publisher must know, at the call site, **who** consumes the fact and **how** to reach them. Adding a second consumer means editing the publisher.

### Problem 2: Every domain reinvents a private bus + bridge

Cases already needed internal decoupling, so it built its own `CasesEventBus` (a thin wrapper over Node's `EventEmitter`) and then a **bridge** that forwards selected events into workflows via `workflowsExtensions.getClient(request).emitEvent(...)`:

```5:38:x-pack/platform/plugins/shared/cases/server/workflows/triggers/event_bridge.ts
/**
 * Registers bridge listeners that forward Cases domain events to workflows_extensions.
 */
export function registerCasesWorkflowEventBridge(
  casesEventBus: CasesEventBus,
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined,
  logger: Logger
): void {
  if (!workflowsExtensions) {
    return;
  }

  const forward = async (eventType: string, payload: unknown, request: KibanaRequest) => {
    try {
      const client = await workflowsExtensions.getClient(request);
      await client.emitEvent(eventType, payload as Record<string, unknown>);
    } catch (error) {
      logger.warn(`Failed to emit workflow trigger "${eventType}": ${error}`);
    }
  };
```

This is a sensible local design, and that is exactly the problem: **other plugins will copy it**. Cases adopted this pattern specifically to keep workflow-event publishing out of its domain code — the domain emits a plain `caseCreated` event, and a separate bridge translates it into workflows calls. Any plugin that wants the same separation (domain code that does not import or call workflows directly) has no choice but to reproduce the same machinery: own bus → adapter → workflows API. The bus is private, so no third plugin (telemetry, billing, Agent Builder, an inbox) can subscribe to Cases events either; they would each need their own bridge.

### Problem 3: The only "shared" inbound API is workflows-specific

`workflows_extensions` exposes `emitEvent(triggerId, payload)` — "something happened, maybe run workflows." That is a **workflows entry point**, not a general bus. Two non-workflow plugins cannot use it to notify each other, and there is no standard **outbound** channel for execution lifecycle: when a workflow or step starts/finishes, nothing notifies other plugins. Consumers either couple into the engine or poll Elasticsearch indices.

### Why this matters now

Multiple in-flight efforts independently need the same thing — a way to observe domain facts without coupling:

- **Agent Builder** wants workflow lifecycle (`WorkflowStarted`, `WorkflowFinished`) and a neutral event layer rather than a workflows-only path ([AB Slack thread](https://elastic.slack.com/archives/C0A2RUHDJCB/p1779788276043349)).
- **Inbox / HITL** wants to react to specific step lifecycle events.

Each of these will otherwise build its own bridge. We are about to repeat Problem 2 once per consumer.

---

## The Core Idea

> The domain event bus is an **in-process** publish/subscribe layer built on Node's built-in `EventEmitter`. If an event is emitted on `kibana_node_3`, **all subscribers handle that event on `kibana_node_3`**. There is **no event distribution across nodes, no dead-letter queue, no retries, no persistence, no ordering guarantees**. It is a simple, synchronous, fire-and-forget publisher/subscriber mechanism — the kind a single process needs, not the kind a distributed micro-service mesh needs.

It is an **alternative to calling a specific plugin's API function** directly, with one crucial difference: **the publisher does not know who (if anyone) will handle the event.** A plugin publishes a fact about its own domain; zero or more plugins react. Adding or removing a consumer never touches the publisher.

This is deliberately the *smallest possible* thing that solves the coupling problem. Anything durable, cross-node, or guaranteed already has a home in Kibana (Elasticsearch as the source of truth, Task Manager for durable/retried work). The bus does not compete with those.

---

## Why Not Something Bigger?

It is tempting to reach for a "real" message bus. Each heavier option is explicitly **out of scope**, and here is why:

| Option | Why not (for this RFC) |
|---|---|
| **Cross-node distribution** (every node sees every event) | Requires a transport (ES, Redis, Kafka) and turns a function call into a network protocol. Global state already lives in Elasticsearch; subscribers that need cross-node visibility read from there. |
| **Dead-letter queue / retries** | Implies durability and delivery guarantees the bus does not make. Work that must not be lost belongs in **Task Manager**, which already gives scheduling, retries, and persistence. |
| **Ordering / exactly-once** | An in-process `EventEmitter` invokes handlers synchronously in registration order within one node; we make no promise beyond that, and consumers must not assume more. |
| **Backpressure / queueing** | Fire-and-forget by design. A subscriber that needs to serialize work (e.g. AB per-conversation queueing) owns that concern; the bus does not. |

The bus is **not** a replacement for durable storage, Task Manager, or the workflow event logger (which writes ops/debug logs to a data stream). It sits beside them as the lightweight, in-memory decoupling primitive that is currently missing.

The precedent already exists in-tree: `CasesEventBus` *is* exactly this (a typed `EventEmitter`). The proposal is to lift that pattern out of one plugin and make it a neutral, shared contract.

---

## Solution: One Shared Bus, Many Domains

A single bus instance per Kibana node, exposed on a neutral contract (a dedicated package or platform plugin — **not** on `workflows_execution_engine`'s contract, since the engine must be just another participant).

```
                    ┌─────────────────────────┐
                    │   Domain event bus      │
                    │   (in-process, 1/node)  │
                    └───────────▲─────────────┘
                                │
            publish             │             subscribe
                                │
     ┌──────────────┬───────────┼───────────┬──────────────┐
     │              │           │           │              │
┌────┴────┐   ┌─────┴─────┐ ┌───┴───┐  ┌────┴────┐   ┌─────┴─────┐
│ Cases   │   │ Alerting  │ │ Inbox │  │ Agent   │   │ Workflows │
│         │   │           │ │       │  │ Builder │   │  engine   │
└─────────┘   └───────────┘ └───────┘  └─────────┘   └───────────┘
 publish        publish       sub        sub          pub + sub
```

| Participant | Role on the bus |
|---|---|
| **Any plugin** | `publish(event)` when something happens in its domain |
| **Any plugin** | `subscribe(eventType, handler)` for side effects (scheduling, metrics, UI, indexing, …) |
| **Workflows engine** | **Subscriber:** consume domain events, match the trigger registry, schedule subscribed workflows |
| **Workflows engine** | **Publisher:** emit workflow/step lifecycle events after persisted state changes |

The engine is special only in that it has a trigger registry and emits lifecycle events. On the bus itself, it is one publisher and one subscriber like everyone else.

### Proposed contract (illustrative)

```ts
interface DomainEvent<T = unknown> {
  /** Stable `domain.action` identifier, e.g. 'cases.caseCreated', 'workflows.workflowFinished'. */
  type: string;
  /** Versioned payload. */
  payload: T;
  /** Request scope where available (space, auth) — preserved, never re-derived by subscribers. */
  request?: KibanaRequest;
}

interface DomainEventBus {
  publish(event: DomainEvent): void;                       // fire-and-forget, returns immediately
  subscribe(type: string, handler: (event: DomainEvent) => void): () => void; // returns unsubscribe
}
```

Subscribers are ordinary functions. Fire-and-forget (`void handler(event)`) is the norm so the publisher never blocks on a subscriber's I/O. A handler that throws must not break the publisher or sibling subscribers — the bus wraps each handler in a try/catch and logs.

### Behavior summary

- **In-process, same node.** Publish and handle on the node running the publishing code. Every node registers the same subscribers at startup, so behavior is symmetric across nodes.
- **Not cross-node messaging.** An event emitted on node 3 is handled only on node 3. Cross-node truth stays in Elasticsearch.
- **Persist, then publish (for lifecycle).** The engine writes execution/step documents first, then publishes. The bus never replaces durable storage.
- **No retries / no DLQ.** If a subscriber must not lose work, it should schedule a Task Manager task from its handler.

---

## Where It Is Useful (Reference Consumers)

These are illustrative; the bus is domain-agnostic and none of these are special-cased in its design.

| Consumer | Role | What it does on the bus |
|---|---|---|
| **Agent Builder** | Subscriber | Reacts to workflow domain events (`WorkflowStarted`, `WorkflowFinished`) to drive conversation/round state without coupling to the engine. |
| **Inbox** | Subscriber | Subscribes to `StepStarted` / `StepFinished` and filters on `stepType` to handle only HITL steps. |
| **Cases** | Publisher | Publishes `CaseCreated`, `CaseUpdated`, etc. directly to the shared bus, **deleting** its private `CasesEventBus` + `event_bridge.ts`. The engine subscribes via the trigger registry. |
| **Workflows engine** | Publisher + Subscriber | **In:** receives domain events (`case.created`, `alert.triggered`), matches the trigger registry, schedules workflows — without importing Cases, Alerting, etc. **Out:** publishes lifecycle events. |
| **Workflows telemetry** | Subscriber | Listens to the engine's own lifecycle events and forwards them to telemetry, instead of telemetry calls being embedded in execution code. |
| **Workflows billing** | Subscriber | Listens to engine lifecycle events to count billable units, instead of billing logic living inside the execution path. |
| **APM tracing** | Subscriber | Listens to lifecycle events to open/close APM spans — `WorkflowStarted`/`WorkflowFinished` bound a transaction, `StepStarted`/`StepFinished` mark child spans — without threading APM calls through execution code. |

The win is **symmetry**: telemetry and billing subscribe to `WorkflowFinished` the exact same way the engine subscribes to `case.created`. Nobody imports anybody.

---

## Code Examples: Plugins Communicating Through the Bus

The snippets below are illustrative and trace one end-to-end flow: **Cases publishes a fact**, the **engine reacts** and schedules a workflow, the engine then **publishes lifecycle facts**, and **Inbox / Agent Builder / telemetry / billing react** — none of these plugins importing one another.

### 1. Typed events live in the shared package

Event types are declared once, as a `domain.action` map, so both `publish` and `subscribe` are type-checked. The bus interface from the contract section becomes generic over this map:

```ts
// @kbn/domain-events/common/events.ts
import type { KibanaRequest } from '@kbn/core/server';

export interface DomainEventMap {
  'cases.caseCreated': { caseId: string; owner: string; title: string };
  'cases.caseUpdated': { caseId: string; updatedFields: string[] };
  'workflows.workflowStarted': { spaceId: string; workflowId: string; workflowRunId: string };
  'workflows.workflowFinished': {
    spaceId: string;
    workflowId: string;
    workflowRunId: string;
    status: 'completed' | 'failed' | 'cancelled';
  };
  'workflows.stepFinished': {
    spaceId: string;
    workflowRunId: string;
    stepId: string;
    stepType: string; // e.g. 'hitl.approval' — lets subscribers filter
    status: 'completed' | 'failed';
  };
}

export type DomainEventType = keyof DomainEventMap;

export interface DomainEvent<T extends DomainEventType = DomainEventType> {
  type: T;
  payload: DomainEventMap[T];
  request?: KibanaRequest; // space / auth scope, preserved as-is
}

export interface DomainEventBus {
  /** Fire-and-forget; returns immediately, never throws on subscriber errors. */
  publish<T extends DomainEventType>(event: DomainEvent<T>): void;
  /** Returns an unsubscribe function. */
  subscribe<T extends DomainEventType>(
    type: T,
    handler: (event: DomainEvent<T>) => void
  ): () => void;
}
```

### 2. A plugin receives the bus from its start dependencies

No plugin imports another plugin's code — they only depend on the neutral bus contract (exactly how the engine already receives its deps in [plugin.ts](src/platform/plugins/shared/workflows_execution_engine/server/plugin.ts)):

```ts
// any_plugin/server/plugin.ts
interface MyPluginStartDeps {
  domainEvents: DomainEventBus;
  // ...other deps
}

export class MyPlugin implements Plugin {
  public start(core: CoreStart, plugins: MyPluginStartDeps) {
    const { domainEvents } = plugins;
    // publish and/or subscribe here
  }
}
```

### 3. Publisher: Cases announces a domain fact

**Before** — Cases keeps a private `EventEmitter` ([event_bus.ts](x-pack/platform/plugins/shared/cases/server/events/event_bus.ts)) and a dedicated bridge that knows about workflows ([event_bridge.ts](x-pack/platform/plugins/shared/cases/server/workflows/triggers/event_bridge.ts)):

```ts
// Today: Cases -> its own bus -> bridge -> workflows-specific emitEvent
casesEventBus.emitCaseCreated(request, payload);
// ...and registerCasesWorkflowEventBridge() forwards it:
const client = await workflowsExtensions.getClient(request);
await client.emitEvent(CaseCreatedTriggerId, payload);
```

**After** — Cases publishes one neutral fact and is done. It does not know the engine (or anyone) exists. The whole `event_bridge.ts` file is deleted:

```ts
// cases/server/.../create_case.ts
domainEvents.publish({
  type: 'cases.caseCreated',
  payload: { caseId, owner, title },
  request,
});
```

### 4. Subscriber: the engine reacts and schedules workflows (inbound)

The engine registers its subscribers at `start()`. It receives the fact, matches the trigger registry, and schedules — without importing Cases:

```ts
// workflows_execution_engine/server/plugin.ts (start)
this.unsubscribers.push(
  domainEvents.subscribe('cases.caseCreated', (event) => {
    // fire-and-forget: never block the publisher on scheduling I/O
    void this.matchTriggersAndScheduleWorkflows(event);
  })
);
```

### 5. Publisher: the engine emits lifecycle facts (outbound)

Persist first, then publish. The execution indices remain the source of truth:

```ts
// after the repository write succeeds
await workflowExecutionRepository.updateStatus(workflowRunId, 'completed');

domainEvents.publish({
  type: 'workflows.workflowFinished',
  payload: { spaceId, workflowId, workflowRunId, status: 'completed' },
});
```

### 6. Subscriber: Inbox filters on `stepType` for HITL steps

Inbox only cares about human-in-the-loop steps, so it filters inside its handler:

```ts
// inbox/server/plugin.ts (start)
domainEvents.subscribe('workflows.stepFinished', (event) => {
  if (!event.payload.stepType.startsWith('hitl.')) {
    return; // ignore everything that is not a HITL step
  }
  void this.recordHitlOutcome(event.payload);
});
```

### 7. Subscribers are symmetric: Agent Builder, telemetry, billing

Three independent plugins react to the same `workflows.workflowFinished` fact. Adding or removing any of them never touches the engine that published it:

```ts
// agent_builder/server/plugin.ts
domainEvents.subscribe('workflows.workflowFinished', (event) => {
  void this.advanceConversationRound(event.payload.workflowRunId);
});

// workflows telemetry
domainEvents.subscribe('workflows.workflowFinished', (event) => {
  void this.telemetry.reportWorkflowFinished(event.payload);
});

// workflows billing
domainEvents.subscribe('workflows.workflowFinished', (event) => {
  void this.billing.countWorkflowRun(event.payload.spaceId);
});
```

APM tracing is the same pattern, but pairs the start and finish facts to bound a transaction — again without any APM call living inside the execution path:

```ts
// workflows APM tracing
const transactions = new Map<string, Transaction>();

domainEvents.subscribe('workflows.workflowStarted', (event) => {
  const transaction = apm.startTransaction(`workflow ${event.payload.workflowId}`, 'workflow');
  transactions.set(event.payload.workflowRunId, transaction);
});

domainEvents.subscribe('workflows.workflowFinished', (event) => {
  const transaction = transactions.get(event.payload.workflowRunId);
  transaction?.setOutcome(event.payload.status === 'completed' ? 'success' : 'failure');
  transaction?.end();
  transactions.delete(event.payload.workflowRunId);
});
```

### 8. Clean up subscriptions on stop

`subscribe` returns an unsubscribe function; capture it and release on `stop()` to avoid leaked subscriptions:

```ts
export class MyPlugin implements Plugin {
  private readonly unsubscribers: Array<() => void> = [];

  public start(core: CoreStart, { domainEvents }: MyPluginStartDeps) {
    this.unsubscribers.push(
      domainEvents.subscribe('workflows.workflowFinished', (event) => {
        void this.handle(event);
      })
    );
  }

  public stop() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }
}
```

---

## Workflows Engine on the Bus

### Consumer (inbound → run workflows)

Today: external code calls `workflowClient.emitEvent(triggerId, payload)` → trigger handler resolves subscriptions → engine runs workflows.

With the shared bus: plugins `publish` typed events (`case.created`, `alert.triggered`). A thin workflows listener, registered at startup:

1. Receives the event from the shared bus.
2. Matches it against the **trigger registry** (trigger id / event type mapping, payload schema).
3. Resolves subscribed workflows in the space and schedules runs — identical semantics to today (validation, event-chain depth, etc.).

`emitEvent` can remain as a convenience wrapper that simply `publish`es onto the shared bus, then be retired over time — an implementation detail, not a breaking change.

### Publisher (outbound → lifecycle)

After authoritative writes to the execution indices, the engine **publishes** lifecycle events:

| Event | When (illustrative) |
|---|---|
| `WorkflowStarted` | Execution record created and run scheduled/started |
| `WorkflowFinished` | Execution reached a terminal status (completed, failed, cancelled, …) |
| `StepStarted` | Step execution begins |
| `StepFinished` | Step execution reaches a terminal status |

Payloads carry stable identifiers (`spaceId`, `workflowId`, `workflowRunId`, `stepId`, `stepExecutionId`, `status`, timestamps, and `stepType` so subscribers like Inbox can filter). Indices remain the source of truth; **publish after persist**.

---

## What This Is Not

| Mechanism | Role |
|---|---|
| **Domain event bus (proposed)** | Neutral, in-process publish/subscribe between plugins on one node |
| **Per-plugin private bus** (e.g. `CasesEventBus`) | Becomes unnecessary for cross-plugin flows; removed once domains publish to the shared bus |
| **`emitEvent` as a primary API** | Workflows-specific; wraps or delegates to shared `publish` |
| **Task Manager** | Durable, retried, scheduled work — where a subscriber goes when delivery must be guaranteed |
| **Workflow event logger** | Ops/debug logs to a data stream — not a plugin-to-plugin bus |
| **Elasticsearch** | Cross-node source of truth — the bus never holds global state |

---

## Event Type Naming & Versioning

- Types are `domain.action` strings: `cases.caseCreated`, `alerting.ruleTriggered`, `workflows.workflowFinished`, `workflows.stepFinished`.
- Payloads are **versioned**; subscribers tolerate additive changes. Breaking a payload requires a new event type or an explicit version bump, documented alongside the type.
- A central registry of known event types and payload schemas keeps publishers and subscribers honest (TBD: enforced via TypeScript types in the shared package).

---

## Ownership and API (TBD)

The bus lives behind a **shared contract**, not on `workflows_execution_engine` start.

- New neutral home: a dedicated package (e.g. `@kbn/domain-events`) or an existing platform plugin's setup/start contract.
- `publish(event: DomainEvent)` — any plugin.
- `subscribe(type, handler): unsubscribe` — any plugin.
- The engine registers its subscriber(s) and publishes lifecycle types in `start`.

Open question to resolve before implementation: **package vs platform plugin**. A package is simplest if the bus is purely in-memory and stateless; a platform plugin is warranted if we need lifecycle hooks (startup subscriber registration, `stop` cleanup) on a single shared instance per node.

---

## PoC Scope

### What the PoC will cover

| Deliverable | Description |
|---|---|
| `DomainEventBus` contract | `publish` / `subscribe` over Node `EventEmitter`, per-handler try/catch + logging |
| Neutral home | Exposed on a shared package or platform plugin contract (decision in PoC) |
| Engine consumer | Workflows listener: bus event → trigger registry → schedule (wrapping/replacing `emitEvent`) |
| Engine publisher | `WorkflowStarted`, `WorkflowFinished`, `StepStarted`, `StepFinished` published after repository writes |
| Event naming + types | `domain.action` convention, versioned payload types in the shared package |
| Unit tests | publish/subscribe, fire-and-forget non-blocking, handler isolation on throw, trigger-matching via bus |

### What the PoC will NOT cover

- Cross-node event distribution.
- Dead-letter queue, retries, or any delivery guarantee (use Task Manager from a handler instead).
- Ordering or exactly-once guarantees beyond `EventEmitter`'s synchronous, in-registration-order invocation on a single node.
- Backpressure / per-key queueing (e.g. Agent Builder's per-conversation serialization — a consumer concern).
- Migrating every existing bridge at once.

---

## Implementation Outline

1. Define `DomainEventBus` + `DomainEvent` shape; expose on a neutral start contract; wrap each handler in try/catch with logging.
2. Migrate/wrap inbound triggers: bus event → trigger registry → schedule (engine or a thin workflows listener). Keep `emitEvent` as a wrapper.
3. Engine publishes `WorkflowStarted`, `WorkflowFinished`, `StepStarted`, `StepFinished` **after** repository writes.
4. Document event-type naming (`domain.action`) and payload-compatibility rules.

---

## Known Limitations

1. **Single-node only.** Subscribers only see events emitted on their own node. Anything needing a global view must read Elasticsearch. This is intentional and must be documented prominently so consumers do not assume cross-node delivery.

2. **No delivery guarantees.** Fire-and-forget. If the process dies between `publish` and a handler finishing its work, that work is lost. Subscribers that cannot lose work must schedule a Task Manager task from their handler.

3. **Synchronous handler invocation.** `EventEmitter` calls handlers synchronously in registration order. A slow synchronous handler delays siblings; handlers should return quickly and defer I/O (`void asyncWork()`). The bus isolates throws but cannot isolate a handler that blocks the event loop.

4. **No ordering across event types.** Two related events (e.g. `StepStarted` then `StepFinished`) are only ordered to the extent the publisher emits them in order on one node; subscribers must not assume global ordering.

5. **Payload coupling risk.** Even without import coupling, subscribers depend on payload shape. Versioning discipline and a central type registry are required to prevent silent breakage.

---

## Open Questions

1. **Ownership and maintenance.** Who owns the shared bus — the team that builds it, maintains the contract, reviews new event types, and is on the hook when something breaks? Because the bus is deliberately neutral (not workflows-owned), it needs a clear home: a platform team owning a shared package/plugin, or a designated owner with a lightweight review process for additions. This must be settled before the bus becomes load-bearing for multiple plugins.

2. **Package vs platform plugin.** Should the bus ship as a stateless `@kbn/domain-events` package or as a platform plugin exposing a single per-node instance on its contract? A plugin is warranted if we need lifecycle hooks (startup subscriber registration, `stop` cleanup); a package is simpler if the bus stays purely in-memory and stateless.

3. **Event registry governance.** Where do event types and payload schemas live, and what is the process to add/change one? Is registration centralized (one schema file all teams edit) or federated (each domain declares its own types that the bus aggregates)? How are breaking payload changes reviewed and versioned?

4. **Scope of the first migration.** Cases is the obvious first publisher to migrate off its private bus + bridge. Do we also migrate inbound trigger handling (`emitEvent`) in the same effort, or keep `emitEvent` as a wrapper indefinitely?

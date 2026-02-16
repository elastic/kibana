# Data stream client lacks mget — read lag risk and options

## Context: why we are considering data streams

Migration of workflow step execution storage to Data Streams is being considered in response to [elastic/security-team#15147](https://github.com/elastic/security-team/issues/15147).

---

## Current model

Step executions are **mutable objects**: each step execution uses an **upsert** model. Updates are **sequential**, so there are no race conditions. Step execution IDs are **deterministic**, derived from step scope and step name.

---

## Transition to data streams: event-based model

We can model step execution as **immutable events** with **deterministic event IDs**:

- `{step_execution_id}_started`
- `{step_execution_id}_waiting`
- `{step_execution_id}_finished`

This **three-event model** covers both simple (start→finish) and wait flows (start→wait→finish). For any step execution ID we can build the list of possible event IDs and mget them; missing events (e.g. no waiting event for a step that didn’t wait) are simply absent. Deterministic IDs allow fetching by ID without search.

**Workflow execution document:** The **WorkflowExecution** document (e.g. the type backing `EsWorkflowExecution`) stores an **array of step execution IDs** at the workflow level. That list is the source of truth for which step executions belong to a run; we use it to build the list of event IDs to mget.

**Client polling:** When the client polls for execution status, the server reads the workflow execution (including its `stepExecutionIds`), mgets all relevant events by the deterministic event IDs, glues them into **StepExecution** objects, and returns those to the client. The client sees the same StepExecution shape as today; the event-based storage and assembly are implementation details on the server.

---

## Challenges with data streams

- **mget and missing events** — When we mget the three possible event IDs per step, we get `found: false` for events that didn’t occur (e.g. no `_waiting` for steps that never waited). **Low risk:** callers can treat missing events as “did not happen.”
- **At most one waiting transition per step** — A step cannot have multiple distinct transitions to waiting (e.g. wait → resume → wait again) in the current event model. Not critical for today, but may matter in the future.
- **Container steps (foreach, retry)** — Their state is **mutable** and changes every iteration, so it cannot live in immutable step execution events. **Mitigation:** use a separate **regular index** for mutable step state; keep events in the data stream.
- **Lack of mget in the Data Streams client** — If reads go through the client, they must use search, which sees data only after refresh. The execution engine would then have to **wait for index refresh** when resuming tasks in order to load workflow context reliably. This is the main risk covered in the options below.
- Other challenges may surface as the design is refined.

---

## The risk (mget in more detail)

The Kibana Data Streams client exposes only **search** (read), **create** (write), and **exists**. It has **no mget** (multi-get by document ID). If all reads go through this client, they must use **search**, which only sees documents after the next **refresh** (typically ~1 second). Concretely:

1. **Read-after-write in the same workflow run** — When execution state is reloaded (e.g. resuming a run or another step needing prior step data), a search-based read may not yet see the events just written. Result: wrong or missing step state and execution bugs.
2. **“Get execution” API** — Callers may get stale data for a short window; less critical than (1) but still undesirable.

Relying on the data stream client with search-only reads is therefore a **real consistency risk** for workflow execution.

---

## Where the gap is

At the **Elasticsearch** API level, mget is supported for data streams (you can target a data stream by name). The limitation is only in the **Kibana** Data Streams client, which does not expose mget.

---

## Options

### Option 1: Hybrid — data stream for writes, direct Elasticsearch mget for reads

Use the data stream client only for **writes**. For **reads**, call the underlying Elasticsearch client’s mget against the same data stream (by name). No refresh lag and no change to the platform client.

- **Result:** Data stream semantics (and future ILM/stream benefits) are kept, with immediate, consistent reads. Application code uses two access paths: client for writes, Elasticsearch client for reads by ID.

---

### Option 2: Add mget to the platform Data Streams client

Extend the Kibana Data Streams client with an mget (or get) that uses the Elasticsearch mget API against the data stream, with the same space/ID rules as create. All consumers then use a single API for both writes and reads without lag.

- **Pros:** One consistent API; no hybrid pattern in plugins.
- **Cons:** Requires a platform change and agreement on behavior (e.g. space handling).

---

### Option 3: Stay on regular indexes (hot indexes + data streams for history)

Use **regular indexes** for execution; add **data streams** only for user-facing history. Execution engine stays on indexes with mget; history and ILM live on data streams.

**Hot indexes (execution engine only)**  

- **`.workflows-executions`** and **`.workflows-step-executions`** — regular indexes where we create/update documents. They are **hot**: actively used by the execution engine and must stay very fast.
  - **Time-series order** — Index documents sorted by **timestamp ASC** so the hot indexes behave as time-series. This improves **deleteByQuery** performance when removing old documents (e.g. by age).
  - **Minimal indexed fields** — e.g. only what’s needed for ILM (e.g. status).
  - **ILM policy** — delete old documents on a schedule (e.g. every day or week).
  - **Optional:** A Kibana task manager task running daily/weekly that **deletes by query** (e.g. documents older than 1 day with status COMPLETED) to keep the hot indexes small.
- The workflow execution engine **relies only on these two hot indexes** to perform executions: it uses **mget** on the hot indexes to get/restore execution state. No dependency on data streams for correctness or latency.

**Data streams (execution history for UI)**  

- **`.workflows-executions-data-stream`** and **`.workflows-step-executions-data-stream`** — data streams with **user-configurable ILM** (retention, when to delete, when to move to cold, etc.). Predefined ILM policies that the user can change; this will require **versioning**. They define **indexed fields** sufficient for **analytics and search** (unlike the minimal indexing on hot indexes).
- Used by the **UI to show execution history** (list, filters, etc.) and for **analytics**.
- We **write to both** hot indexes and data streams (e.g. with `refresh: false`) so history is populated without slowing down the hot path.

**Polled endpoint (live vs history)**  

- To show **live** executions, the polled endpoint used by the UI must read from the **hot indexes** so the user sees up-to-date status without refresh lag.
- For **historical** views, the same (or another) endpoint reads from the **data streams**.
- The API needs a **condition** to decide when to read from hot indexes vs data streams (e.g. “recent / in progress” → hot; “older / completed” → data streams).

---

## Recommendation

- If you **need data streams** (ILM, stream semantics, etc.): use **Option 1 (hybrid)** — data stream client for writes, direct mget for reads — to avoid lag while keeping data stream benefits.
- If data streams are only exploratory: **Option 3** is the lowest-risk path today.
- **Option 2** is the right long-term direction if multiple plugins need consistent, low-latency reads from data streams; it can be done as a follow-up.

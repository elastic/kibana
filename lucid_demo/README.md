# Lucid dreaming demo

**Story.** Acme Cloud support uses an agent while working tickets. A support engineer tells the agent about a ticket and asks it to remember the fix. A few minutes later, Lucid dreaming has turned that memory into facts and entities. A few minutes after that, it also learns a refund policy that nobody asked the agent to save: that came from the chat transcript.

## Before recording

1. Start Elasticsearch and Kibana from this worktree (`kibana_lucid`). `config/kibana.dev.yml` turns on:
   - Context Engine, Workflows and Agent Builder experimental features;
   - memory (`contextEngine:memoryEnabled`, a global setting);
   - user prompts, LLM responses, tool details and real agent IDs in Agent Builder traces. Without prompts and responses, transcripts are empty.
2. Make sure a default AI connector works (for example EIS via `node scripts/eis.js`). Dreaming uses it.
3. Have one throwaway chat with the default Elastic agent. This creates the traces data stream, and avoids a first-round race on a fresh stack where the agent has no memory tools.
4. Run `node lucid_demo/setup.mjs setup`. It creates:
   - AI index `lucid_demo`, with the **Customer support** dreaming types and dreaming **off**;
   - agent `lucid-demo-support` ("Acme support assistant"), assigned to `lucid_demo`;
   - an agent trace source on `lucid_demo` for that agent.
5. Open these tabs:
   - **Context Engine** → `lucid_demo` → **Knowledge documents**;
   - **Context Engine** → `lucid_demo` → **Settings** → Dreaming;
   - **Agent Builder** → chat with **Acme support assistant**;
   - **Workflows**;
   - a terminal for `node lucid_demo/setup.mjs status` (optional, a quick way to show counts).

To retake, run `setup` again. It resets everything first.

## Scenes

### 1. Nothing learned yet

- Show **Knowledge documents** for `lucid_demo`: empty.
- Show there are no transcripts for the agent. In Discover (ES|QL):
  ```esql
  FROM traces-agent_builder.otel-default
  | WHERE attributes.gen_ai.agent.id == "lucid-demo-support"
  ```
  No results. Or run `status`: 0 documents, 0 rounds.

### 2. Turn on Lucid dreaming

In **Settings** → Dreaming:

There are two separate toggles, each with its own schedule:

- **Lucid Dreaming** builds facts and entities within minutes. Its schedule goes from `1m` to `59m`.
- **Relationship Dreaming** links them, from `1h` to `30d`.

1. Turn on **Lucid Dreaming**, and keep **Every** at `1m`.
2. Set **Lucid dreaming connector ID** to `.anthropic-claude-5.5-sonnet-chat_completion`. That's cheaper than the Opus dreaming default. Smaller models (Flash-Lite, Haiku, GPT-5.4 Mini) handle memories well, but on transcripts they often re-extract what the memory already saved, which shows up as duplicates.
3. Turn on **Relationship Dreaming**, with **Every** at `1h`.
4. **Save changes**.

Saving installs the Lucid workflows and the relationships workflow, and starts the watcher. The watcher checks the AI index every minute.

### 3. Chat with the agent

Send these two messages to **Acme support assistant**, one at a time. Send message 2 right after the first answer: both rounds land in one transcript batch only if they end within about 2 minutes of each other.

**Message 1** (asks for a memory):

> New ticket SUP-1042 from Northwind Traders: their billing page crashes on Safari 16.4 right after login. Engineering confirmed it's a known issue in the new invoice viewer, fixed in release 3.18. Until then, the workaround is to export invoices as CSV from Settings > Billing > Export. Please remember this for the team.

The agent calls **Remember** and says what it saved.

**Message 2** (no memory asked for):

> Thanks. Northwind is on the Enterprise annual plan and asked for a refund for the month they couldn't see invoices. I told them our policy: annual Enterprise customers get a prorated service credit, not a refund, if they ask within 30 days of the incident.

The agent restates the policy, saves nothing and offers to save it. This policy now exists only in the transcript.

Back in **Knowledge documents**: one `memory.session_fact` (the session memory). The two chat rounds are in the traces.

### 4. Lucid dreaming picks them up

In **Workflows**:

- About **1 minute** after message 1, **Lucid dreaming: lucid_demo** runs. Its trigger is `context-engine.lucidDreamingBatchReady`, with `source: memories` and the memory's ID.
- About **3–4 minutes** after message 1, **Lucid trace dreaming: lucid_demo** runs, with `source: traces` and the two rounds.

Open an execution to show the batch (IDs only) and the extraction step.

### 5. Facts and entities appear

Refresh **Knowledge documents**.

After the memory run (from the dry run with Sonnet 5.5):

| Type | Title |
| --- | --- |
| `entity.issue` | Billing page crashes on Safari 16.4 after login (invoice viewer) |
| `entity.platform` | Safari 16.4 |
| `entity.product_area` | Billing (invoice viewer) |
| `fact.known_issue` | Billing page crashes on Safari 16.4 after login |
| `fact.workaround` | Export invoices as CSV when billing page crashes on Safari 16.4 |

After the transcript run, only what the transcript adds:

| Type | Title |
| --- | --- |
| `entity.plan` | Enterprise annual plan |
| `fact.policy` | Annual Enterprise incident refund requests get prorated service credit |

The transcript run skips what the agent saved as a memory, since the memory run already covers it. The model picks the exact titles, and sometimes adds a `fact.solution` for the 3.18 fix.

Closing line: Relationship Dreaming links these entities on its own, slower schedule (every hour here). Lucid Dreaming and Relationship Dreaming turn on and off separately.

## Timing

| Step | Wait | Why |
| --- | --- | --- |
| Memory saved → batch sent | about 1 min | 30 s settle, a part-full batch waits 30 s, and the watcher runs every minute |
| First round ends → batch sent | about 3–4 min | 1 min settle for traces, then a part-full batch waits 2 min, counted from the oldest round |
| Batch sent → facts appear | about 1 min | One model call per batch |

Cut the recording during the waits, or record scenes 4 and 5 later. Keep the laptop awake (`caffeinate -i`): if it sleeps, the watcher stops too.

## If something is missing

- **The agent says it has no memory tool.** Memory is off: check `globalOverrides` in `kibana.dev.yml`, or it's the first-round race (send the message again).
- **No trace dreaming run.** Run `status`. If it shows 0 rounds, tracing didn't record this agent. If rounds show but nothing ran, check that the transcripts have text (the `includeUserPrompts` and `includeLlmResponses` overrides).
- **The Relationship Dreaming switch is greyed out.** The AI index has no relationship types. Add one under the types, or run `setup` again.
- **No policy fact.** The agent probably doubted the policy ("I couldn't confirm…"), and the Customer support instructions skip anything unconfirmed. The demo agent's instructions prevent this, so check that `setup` ran with the current script.
- **Duplicate facts from the transcript.** The Lucid connector is too small a model; use Sonnet 5.5.

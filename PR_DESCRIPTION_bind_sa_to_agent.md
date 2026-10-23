## Summary

Closes https://github.com/elastic/kibana/issues/290126

Today an agent runs as whoever is talking to it. If you chat with an agent, it uses *your* permissions. If a workflow calls it, it uses the workflow's service account. That makes the same agent behave differently depending on who's driving, which is a problem for things like Nightshift's investigation agent: findings written under one identity can't be read or continued under another.

This PR lets an admin pin an agent to a **service account**. Once pinned, every conversation with that agent runs as that service account, no matter who started the chat. The conversation still belongs to the person (they own it, their messages are attributed to them), but the agent's tools execute with the service account's permissions.

Because "run as a service account" is a way to borrow someone else's permissions through a chat box, three guard rails come with it:

1. **Only a security admin can pin, unpin or edit a pinned agent.** You need the Elasticsearch `manage_security` cluster privilege, the same one Core requires to create the binding. For everyone else a pinned agent is read-only.
2. **Only people with a new privilege can chat with a pinned agent.** There's a new Agent Builder sub-feature privilege, "Chat with agents that run as a service account" (`invoke_bound_agents`). It's included in `All`, not in `Read`. Without it you get a 403. You are never quietly downgraded to running as yourself.
3. **Service accounts calling a pinned agent need that same privilege.** The Slack relay or a workflow service account must hold it too.

Binding is API-only for now (`service_account_id` on the agent create/update APIs). The UI shows the binding and enforces the rules, but doesn't manage it yet. Interactive binding is tracked in https://github.com/elastic/kibana/issues/300118.

## What changed

**Data model**
- `AgentDefinition.service_account_id` (keyword in `.chat-agents`). It's a reference only; the real binding lives in Core's service account workload bindings (encrypted saved object), which is what mints the credential.
- Update semantics: a string binds or replaces, `null` unbinds, omitted keeps.
- `permissions.update_execution_identity` tells the client who may bind. On a bound agent, `update_agent`, `update_access_control` and `update_approvals` are `false` for anyone without `manage_security`.

**Privilege**
- New sub-feature "Service accounts" under Agent Builder with one privilege, `invoke_bound_agents` (`includeIn: 'all'`). API action `agentBuilder:invokeBoundAgents`, UI capability `agentBuilder.invokeBoundAgents`.

**Bind / edit / delete rules (server)**
- Agent Builder registers an `agent` workload type with Core at setup, so bound agents show up on the service account management page.
- Bind/unbind happens in Core *before* the agent document is written, with best-effort compensation if the write fails.
- Agent writes now use optimistic concurrency control (`if_seq_no` / `if_primary_term`), so a concurrent write is refused with a 409 instead of silently overwriting a binding change.
- Every edit of a bound agent, including access control, requires `manage_security`. Deleting one unbinds it first and requires the same privilege.
- Force-deleting a tool, skill or plugin that a bound agent references is refused with a 403 naming the agent, instead of silently rewriting it.
- The default agent can't be bound.

**Execution**
- Before any execution record or user message is written, the service checks the caller's `use` access, that service accounts are enabled, and that the caller holds `invoke_bound_agents`. The resolved identity is stored on the execution as `run_as`.
- Bound executions run through Task Manager with `runAs`: no API key is cloned, Task Manager mints the service account's short-lived token through Core, pinned to the account the agent was bound to at dispatch, and retires it when the run settles.
- A request that *already* runs as the bound account (a workflow step, or a parent agent under the same account) runs inline instead of nesting a second blocking task.
- An idempotent replay of an execution recorded under a different identity is refused with a 409.
- The bound service account gets an implicit `User` role on its own agent so the ACL checks inside the run pass after the credential swap. Conversation writes still act as the human owner.

**UI**
- "Runs as `<service account>`" badge on the agent overview.
- Read-only callout on the Settings tab when you can't edit a bound agent.
- Composer disabled with a callout when you lack the privilege to chat with a bound agent.

## Screenshots

**Agent overview with the "Runs as" badge**

<!-- screenshot -->

**Settings tab, bound agent, caller without `manage_security`**

<!-- screenshot -->

**Chat with a bound agent, caller without the invoke privilege**

<!-- screenshot -->

**Role management: the new sub-feature privilege**

<!-- screenshot -->

**Service account management page listing the bound agent**

<!-- screenshot -->

## How to test

You need a stateful stack with service accounts enabled and an encryption key:

```yaml
xpack.security.serviceAccounts.enabled: true
xpack.encryptedSavedObjects.encryptionKey: "a-32-character-or-longer-secret-key"
```

You also need a GenAI connector configured, otherwise chats fail on model resolution before they reach the interesting checks.

### 1. Create roles and users

```bash
K=http://localhost:5601; E=http://localhost:9200
put_role() { curl -s -o /dev/null -w "%{http_code}\n" -u elastic:changeme -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -X PUT "$K/api/security/role/$1" -d "$2"; }
# Agent Builder "all": can create agents and chat with bound ones, cannot bind
put_role sa-editor '{"elasticsearch":{"cluster":[],"indices":[]},"kibana":[{"base":[],"feature":{"agentBuilder":["all"],"actions":["read"]},"spaces":["*"]}]}'
# Agent Builder "read": can see the agent, cannot chat with a bound one
put_role sa-viewer '{"elasticsearch":{"cluster":[],"indices":[]},"kibana":[{"base":[],"feature":{"agentBuilder":["read"],"actions":["read"]},"spaces":["*"]}]}'
# Agent Builder "all" + manage_security: can bind and edit bound agents
put_role sa-binder '{"elasticsearch":{"cluster":["manage_security"],"indices":[]},"kibana":[{"base":[],"feature":{"agentBuilder":["all"],"actions":["read"]},"spaces":["*"]}]}'
# Role for the service account: the only identity that can read the restricted index
put_role sa-agent-role '{"elasticsearch":{"cluster":[],"indices":[{"names":["restricted-sa-test"],"privileges":["read"]}]},"kibana":[{"base":[],"feature":{"agentBuilder":["read"],"actions":["read"]},"spaces":["*"]}]}'

put_user() { curl -s -o /dev/null -w "%{http_code}\n" -u elastic:changeme -H 'Content-Type: application/json' -X POST "$E/_security/user/$1" -d "{\"password\":\"changeme-test\",\"roles\":[\"$2\"]}"; }
put_user editor sa-editor; put_user viewer sa-viewer; put_user binder sa-binder
```

### 2. Create the restricted index, the service account and the agent

```bash
curl -s -u elastic:changeme -H 'Content-Type: application/json' -X POST "$E/restricted-sa-test/_doc?refresh=true" -d '{"message":"only the service account can see this"}'

# The account must be created through Kibana so Kibana holds its credential
curl -s -u elastic:changeme -H 'kbn-xsrf: true' -H 'x-elastic-internal-origin: Kibana' -H 'Content-Type: application/json' -X POST "$K/internal/security/service_account" -d '{"name":"bound-test","roles":["sa-agent-role"]}'

# The editor creates the agent (no manage_security needed for that)
curl -s -u editor:changeme-test -X POST "$K/api/agent_builder/agents" -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{"id":"bound-agent","name":"Bound agent","description":"Test agent for service account binding","access_control":{"access_mode":"public"},"configuration":{"instructions":"Answer briefly. When asked to run an ES|QL query, run it with the ES|QL tool and show the result.","tools":[{"tool_ids":["*"]}]}}'
```

### 3. Bind the agent

```bash
# 403: editor has no manage_security
curl -s -u editor:changeme-test -X PUT "$K/api/agent_builder/agents/bound-agent" -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{"service_account_id":"kibana/bound-test"}'

# 200: binder has manage_security
curl -s -u binder:changeme-test -X PUT "$K/api/agent_builder/agents/bound-agent" -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{"service_account_id":"kibana/bound-test"}'

# The binding is visible on the service account
curl -s -u elastic:changeme -H 'x-elastic-internal-origin: Kibana' "$K/internal/security/service_account/kibana%2Fbound-test/workloads"
```

### 4. Check who can edit

```bash
# 403: any edit of a bound agent without manage_security, even a rename
curl -s -u editor:changeme-test -X PUT "$K/api/agent_builder/agents/bound-agent" -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{"name":"Renamed"}'

# 200 and the binding is kept
curl -s -u binder:changeme-test -X PUT "$K/api/agent_builder/agents/bound-agent" -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{"name":"Renamed"}'

# 403: deleting a bound agent without manage_security
curl -s -u editor:changeme-test -X DELETE "$K/api/agent_builder/agents/bound-agent" -H 'kbn-xsrf: true'
```

In the UI, log in as `editor`, open the agent: the header shows "Runs as kibana/bound-test", the Settings tab shows the locked callout, and there is no Save or Delete.

### 5. Check who can chat

```bash
converse() { curl -s -u "$1" -X POST "$K/api/agent_builder/converse" -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d "{\"agent_id\":\"bound-agent\",\"input\":\"$2\"}"; }

# 403: viewer has agentBuilder read only, which does not include invoke_bound_agents
converse viewer:changeme-test "hello"

# 200: editor has agentBuilder all; owner and round author are still "editor"
converse editor:changeme-test "hello"
```

In the UI as `viewer`, select the agent: the composer is disabled with the "You cannot chat with this agent" callout.

### 6. Check the run really uses the service account

```bash
# editor cannot read restricted-sa-test, but the run can: the ES|QL step returns the marker document
converse editor:changeme-test "Run this ES|QL query and show the raw result: FROM restricted-sa-test | KEEP message"

# The execution record carries run_as
curl -s -u elastic:changeme "$E/.chat-agent-executions/_search?q=agent_id:bound-agent&_source=owner,run_as,status" | jq '.hits.hits[]._source'

# Unbind, ask again: now it runs as editor and the query fails
curl -s -u binder:changeme-test -X PUT "$K/api/agent_builder/agents/bound-agent" -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{"service_account_id":null}'
converse editor:changeme-test "Run this ES|QL query and show the raw result: FROM restricted-sa-test | KEEP message"
```

The Kibana audit log (if enabled) shows `service_account_assume` events with `kibana.workload { plugin_id: "agentBuilder", type: "agent", id: "bound-agent", execution_id }`.

### 7. Fail closed

```bash
# Re-bind, then point the stored reference at another account directly in ES
curl -s -u binder:changeme-test -X PUT "$K/api/agent_builder/agents/bound-agent" -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{"service_account_id":"kibana/bound-test"}'
curl -s -u elastic:changeme -H 'Content-Type: application/json' -X POST "$E/.chat-agents/_update_by_query?refresh=true" -d '{"query":{"term":{"id":"bound-agent"}},"script":"ctx._source.service_account_id = \"kibana/someone-else\""}'

# The execution fails with "cannot run as service account ..." instead of running as anyone
converse editor:changeme-test "hello"
```

## Automated tests

```bash
node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder/tsconfig.json
node scripts/jest x-pack/platform/plugins/shared/agent_builder/server/services/agents
node scripts/jest x-pack/platform/plugins/shared/agent_builder/server/services/execution
node scripts/jest x-pack/platform/plugins/shared/agent_builder/public/application
```

Scout API spec (start the stack once, then run the spec against it):

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet agent_builder
npx playwright test --config x-pack/platform/plugins/shared/agent_builder/test/scout_agent_builder/converse/api/playwright.config.ts --project=local bound_agent_api
```

Privilege listing FTRs were updated for the new sub-feature privilege:

```bash
node scripts/functional_tests --config x-pack/platform/test/api_integration/config.ts --grep "privileges"
```

## Notes for reviewers

- The privilege is project-level on purpose. A per-agent "required capability" was discussed and deferred; it layers on top of this design without changing the enforcement point.
- A bound agent invoked from a Task Manager run under a *different* identity (for example a workflow whose service account is not the agent's) schedules its own task and the parent waits on it. Under the same identity it runs inline.
- Core does not verify that the account exists at bind time. Binding a typo'd or ES-created account succeeds and every run then fails with a clear "cannot run as service account" error.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

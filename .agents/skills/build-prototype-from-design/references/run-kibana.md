# Run Kibana (local development)

Use this reference when the **build-prototype-from-design** skill needs a running Kibana instance. Run all commands from the **Kibana repository root** (`kibana/`).

**Canonical docs (more detail):**

- [Set up a development environment](https://docs.elastic.dev/kibana-dev-docs/getting-started/setup-dev-env) (internal)
- [Development getting started](https://www.elastic.co/guide/en/kibana/current/development-getting-started.html) (public)
- [Running Kibana (advanced)](https://www.elastic.co/guide/en/kibana/current/running-kibana-advanced.html)

---

## Agent execution (non-blocking) — read first

When the user asks to **run** or **start** Kibana, the main chat must **not** block on startup (no multi-minute `Await`, no waiting for bundle builds in the foreground).

**Always run [fast-path checks](#fast-path-skip-work-you-already-did) first** (a few seconds). Most repeat sessions only need to start one or two background processes — not bootstrap again.

### Fast path — skip work you already did

Run these in the **main agent** (one Shell call is fine) before delegating anything:

```sh
cd <KIBANA_REPO_ROOT>

# 1) Services already up?
ES_CODE=$(curl -s -o /dev/null -w "%{http_code}" -u elastic:changeme http://localhost:9200 2>/dev/null || echo "000")
KB_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5601/api/status 2>/dev/null || echo "000")

# 2) Bootstrap already done? (same check as scripts/check.js)
BOOTSTRAP=missing
test -f node_modules/.yarn-integrity && BOOTSTRAP=ok

# 3) ES snapshot likely cached? (speeds yarn es snapshot)
ES_CACHE=no
test -d .es && ES_CACHE=yes

echo "es_http=$ES_CODE kibana_http=$KB_CODE bootstrap=$BOOTSTRAP es_cache=$ES_CACHE"
```

#### Decision table

| `es_http` | `kibana_http` | `bootstrap` | What to do |
|-----------|---------------|-------------|------------|
| `200` | `200` | any | **Done.** Tell user stack is already up; link http://localhost:5601 |
| `200` | not `200` | `ok` | **Kibana only** — one background shell: `yarn start --no-base-path --run-examples` |
| not `200` | any | `ok` | **ES + Kibana** — two parallel background shells (Kibana can start while ES boots) |
| any | any | `missing` | **Bootstrap first** (finite, may block briefly), then start only what is still down |

**Skip bootstrap** when `bootstrap=ok` unless:

- User says they switched branches, pulled, or see dependency / `link:packages` errors
- `yarn start` or `yarn es` fails with missing modules → then `yarn kbn bootstrap`

**Skip `yarn es snapshot`** when `es_http=200` (ES already running in another terminal).

**Skip Kibana start** when `kibana_http=200`.

When only one service is needed, still use `block_until_ms: 0` and do **not** start the other.

### Delegate to a background shell agent

1. **Launch a Task** with `subagent_type: "shell"` and a short description (e.g. "Start ES and Kibana").
2. Pass the subagent the **[Background shell prompt](#background-shell-prompt)** below (adapt paths if needed).
3. **Do not wait** for Kibana to be fully ready in the main chat. Reply immediately after the Task is launched with URL, credentials, and "starting in background".
4. Optional: one quick `curl` in the main chat (≤15s total) only if the user explicitly asked to verify readiness.

If the Task tool is unavailable, follow the same rules using **two parallel Shell calls** with `block_until_ms: 0` in one turn, then return to the user without long polling.

### Two processes, two terminals (parallel)

Use only the rows you need after [fast-path checks](#fast-path-skip-work-you-already-did):

| Terminal | Service | Command | When |
|----------|---------|---------|------|
| **1** | Elasticsearch | `yarn es snapshot --license trial` | `es_http` ≠ `200` |
| **2** | Kibana | `yarn start --no-base-path --run-examples` | `kibana_http` ≠ `200` |

When **both** are needed, start them in the **same turn** (parallel). Kibana will retry until Elasticsearch is up.

When **only Kibana** is needed (ES already up), start terminal 2 only — fastest repeat path.

### Shell requirements

Every long-running command **must** use:

- `block_until_ms: 0` (background — do not block the tool on process exit)
- `working_directory`: Kibana repo root
- Prefix with nvm when `.nvmrc` exists:

```sh
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use &&
```

### Background shell prompt

Copy into the Task `prompt` (fill in paths and which services to start from fast-path results):

```
From the Kibana repository root at <KIBANA_REPO_ROOT>:

0. Run fast-path checks (curl ES + Kibana, test node_modules/.yarn-integrity).
   - If both services return HTTP 200: stop, report already running.
   - If bootstrap=missing: run `yarn kbn bootstrap` once, then continue.
   - If bootstrap=ok: do NOT run bootstrap.

1. ONLY IF es_http ≠ 200 — background terminal 1:
   export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use &&
   yarn es snapshot --license trial
   (block_until_ms: 0)

2. ONLY IF kibana_http ≠ 200 — background terminal 2 (same turn as step 1 if both needed):
   export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use &&
   yarn start --no-base-path --run-examples
   (block_until_ms: 0)

3. Do NOT Await bundle builds or "Kibana is now available" for more than 30 seconds total.
4. Return: what was skipped (already up / bootstrap), what was started, shell IDs, URL, credentials.
```

### What to tell the user (main chat)

Always include:

- **URL:** http://localhost:5601
- **Login:** `elastic` / `changeme`
- ES and Kibana are starting in **separate background terminals**
- First load may take **2–5 minutes** (bundles); refresh when ready
- Logs: terminal output files for the two background shells

---

## Prerequisites

- Node.js version from `.node-version` (use `nvm use` if you use nvm)
- Yarn v1 (1.22.x)
- Two terminal sessions (or background processes): one for Elasticsearch, one for Kibana

---

## Step 1 — Bootstrap dependencies

Run after clone, branch switch, or when dependencies look stale (main agent or shell subagent; may block briefly — bootstrap is finite):

```sh
nvm use
yarn kbn bootstrap
```

If bootstrap fails, try in order:

```sh
yarn cache clean && yarn kbn clean
yarn kbn bootstrap --force-install
```

Last resort:

```sh
git clean -fdx
yarn kbn reset
yarn kbn bootstrap --force-install
```

---

## Step 2 — Start Elasticsearch

In **terminal 1** (leave running):

```sh
yarn es snapshot
```

Trial license (all features for prototyping):

```sh
yarn es snapshot --license trial
```

Wait until Elasticsearch is up (listening on `http://localhost:9200`).

---

## Step 3 — Start Kibana

In **terminal 2** (leave running):

### Default (stateful)

```sh
yarn start
```

Open [http://localhost:5601](http://localhost:5601). Log in with `elastic` / `changeme`.

Kibana may also log port `5603` (base path proxy); use **5601** in the browser unless you set a custom base path.

### Recommended for prototypes and examples

Stable URL, examples plugins enabled:

```sh
yarn start --no-base-path --run-examples
```

Open [http://localhost:5601](http://localhost:5601) (no random dev base path).

Alternative (basic license + native login):

```sh
yarn es snapshot --license basic
yarn start --mockIdpPlugin.enabled=false --no-base-path --run-examples
```

### With examples only (default ES + SAML)

```sh
yarn start --run-examples
```

---

## Step 4 — Verify Kibana is ready

For **human** verification after background start:

1. Terminal shows Kibana is available (wording varies by version).
2. Browser loads `http://localhost:5601` (or your base path).
3. Login succeeds with `elastic` / `changeme` (stateful) or `elastic_serverless` / `changeme` (serverless).

Optional status check from repo root:

```sh
curl -s -o /dev/null -w "%{http_code}" http://localhost:5601/api/status
```

Expect `200` when ready (may be `401` before login depending on route).

---

## Agent workflow summary

| Step | Command | When | Blocking? |
|------|---------|------|-----------|
| Fast-path checks | `curl` + `test -f node_modules/.yarn-integrity` | **Always first** | No (seconds) |
| Bootstrap | `yarn kbn bootstrap` | Only if `.yarn-integrity` missing or user switched branch / dep errors | OK (finite) |
| Elasticsearch | `yarn es snapshot --license trial` | Only if ES not on `:9200` | **No** (`block_until_ms: 0`) |
| Kibana | `yarn start --no-base-path --run-examples` | Only if Kibana not on `:5601` | **No** (`block_until_ms: 0`) |
| Verify ready | `curl` status URLs | User or optional quick check | **No** long Await in main chat |

**Typical repeat session:** fast-path → Kibana-only background start (~2 min bundles if ES still running from earlier).

After branch changes: run `yarn kbn bootstrap` again before `yarn start`.

Source changes hot-reload or trigger a server restart automatically.

---

## Serverless (only if prototyping serverless)

Use the same non-blocking pattern: **two parallel background shells**.

**Terminal 1** — pick a project type:

```sh
yarn es serverless --projectType=oblt
# or: security | es | workplaceai
```

**Terminal 2** — matching Kibana mode:

```sh
yarn serverless-oblt
# or: yarn serverless-security | yarn serverless-es | yarn serverless-workplace-ai
```

`--projectType` and the `yarn serverless-*` command **must match**.

---

## Optional configuration

Developer overrides (not committed): create or edit `config/kibana.dev.yml`. Used automatically in dev mode.

Example — point at local ES (often already correct for `yarn es snapshot`):

```yaml
elasticsearch.hosts: http://localhost:9200
elasticsearch.username: kibana_system
elasticsearch.password: changeme
```

### Recommended prototype config

A useful baseline for prototype work. Drop into `config/kibana.dev.yml`:

```yaml
# Enable solution views (Observability / Security / Search nav) on the Spaces UI
xpack.spaces.allowSolutionVisibility: true

# Set the default landing route after login
uiSettings.overrides:
  defaultRoute: /app/observability

# Fake cloud context — enables cloud-gated features locally
xpack.cloud.id: "fake_cloud_id:24h124h11249u31r4"
xpack.cloud.base_url: "https://cloud.elastic.co"

# Elastic-managed LLM (no API key needed for Elastic employees)
xpack.actions.preconfigured:
  elastic-llm:
    name: Elastic LLM
    actionTypeId: .inference
    exposeConfig: true
    config:
      provider: 'elastic'
      taskType: 'chat_completion'
      inferenceId: '.rainbow-sprinkles-elastic'
      providerConfig:
        model_id: 'rainbow-sprinkles'
```

**Notes:**

- `config/kibana.dev.yml` is **not committed**. Create the file if it does not exist. **Never overwrite an existing `kibana.dev.yml` without confirming with the user first** — they may have local settings you would clobber.
- `xpack.spaces.allowSolutionVisibility: true` enables the solution picker in the Spaces UI, but the solution nav must still be set once manually: **Stack Management → Spaces → default → Edit space → Solution**.

Alternate config file:

```sh
yarn start --config=config/my_config.yml
```

---

## Troubleshooting

| Symptom | Action |
|---------|--------|
| `Unsupported URL Type: link:packages/...` | Use Yarn, not npm: `yarn kbn bootstrap` |
| Kibana won't start after branch switch | `yarn kbn bootstrap` or `yarn kbn clean` then bootstrap |
| Out of memory | `export NODE_OPTIONS="--max_old_space_size=2048"` |
| ES connection errors | Ensure `yarn es snapshot` is running in another terminal |
| Wrong / broken URL | Use `--no-base-path` or set `--server.basePath` consistently with `yarn es snapshot --kibanaUrl` |
| Chat blocked for minutes | Never Await startup in main agent; use background shells + Task |

More: [Troubleshooting](https://docs.elastic.dev/kibana-dev-docs/getting-started/troubleshooting).

---

## Help

```sh
yarn start --help
yarn es --help
yarn kbn
```
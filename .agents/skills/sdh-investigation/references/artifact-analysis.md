# Artifact Analysis Patterns

Querying patterns for common SDH artifact types.

**Approach:** Start narrow, widen only if needed. Get counts and summaries first, then drill into specific items. Never dump an entire file.

**Before choosing a strategy**, sniff the file content — some `.log` or `.txt` files are actually JSON:

```bash
head -c 1 file.log  # { or [ → treat as JSON, use jq
```

**Always filter first, never read an entire file.** Artifacts may contain credentials, tokens, and sensitive config — filtering reduces the risk of exposing them. Size determines how aggressively you filter:

| Size     | Approach                                               |
| -------- | ------------------------------------------------------ |
| < 1MB    | `rg`/`jq` with targeted queries                        |
| 1-10MB   | `rg`/`jq` with filters, pipe through `head`            |
| 10-100MB | Targeted `rg`/`grep` searches only                     |
| > 100MB  | `find`/`du` to explore, search specific subdirectories |

---

## HAR Files

HAR files capture browser network traffic. They can be large (10-100MB).

### Step 1: Counts (always start here)

Get the shape of the data before reading any content:

```bash
# How many API calls? What status codes?
jq -r '[.log.entries[] | select(._resourceType == "fetch" or ._resourceType == "xhr") | .response.status] | group_by(.) | map({status: .[0], count: length}) | sort_by(-.count)' file.har

# How many entries total?
jq '.log.entries | length' file.har
```

### Step 2: Failed and slow requests

Focus on anomalies — don't read successful responses:

```bash
# Failed requests (4xx/5xx) — URLs only, no bodies yet
jq -r '.log.entries[] | select(._resourceType == "fetch" or ._resourceType == "xhr") | select(.response.status >= 400) | "\(.response.status) \(.request.method) \(.request.url)"' file.har

# Slow requests (>5s) — timing only
jq -r '.log.entries[] | select(.time > 5000) | "\(.time | round)ms \(.response.status) \(.request.url)"' file.har
```

### Step 3: Drill into specific entries

Only after identifying which entries matter, read their content — truncated:

```bash
# Response body for a specific URL (first 500 chars only)
jq '.log.entries[] | select(.request.url | contains("PATTERN")) | {url: .request.url, status: .response.status, body: (.response.content.text | if . then .[0:500] else null end)}' file.har

# If you need more, increase the truncation or request the full body for one entry
jq '.log.entries[] | select(.request.url | contains("SPECIFIC_ENDPOINT")) | .response.content.text' file.har | head -100
```

### Kibana-specific endpoints (high signal)

| Endpoint pattern   | What it contains                                  |
| ------------------ | ------------------------------------------------- |
| `_inspect`         | Raw ES query DSL, index patterns, timing          |
| `internal/bsearch` | Batch search requests/responses, often compressed |
| `internal/search`  | Single search requests                            |
| `_msearch`         | Multi-search ES queries                           |
| `_async_search`    | Async search queries and results                  |

### Interesting queries (highest signal)

```bash
# Responses with 0 hits (queries that matched nothing)
jq -r '.log.entries[] | select(.response.content.text != null) | select(.response.content.text | test("\"hits\":\\{\"total\":\\{\"value\":0")) | .request.url' file.har 2>/dev/null

# Shard failures
jq -r '.log.entries[] | select(.response.content.text != null) | select(.response.content.text | test("shard.*fail|failed_shards")) | .request.url' file.har 2>/dev/null
```

### ES queries from \_inspect responses

The `_inspect` object exposes the raw Elasticsearch query — critical for query-level debugging:

```bash
# Extract _inspect data from bsearch responses
jq -r '.log.entries[] | select(.request.url | contains("bsearch")) | .response.content.text' file.har \
  | jq -r 'fromjson? | .. | objects | select(has("_inspect")) | ._inspect | {index: (.requestParams.index // .requestParams.path), dsl: .dsl}' 2>/dev/null

# ES query DSL from _inspect endpoints
jq -r '.log.entries[] | select(.request.url | contains("_inspect")) | .response.content.text' file.har \
  | jq -r 'fromjson? | .dsl // .inspect.dsl // empty' 2>/dev/null
```

### Compressed bsearch responses

Kibana's bsearch API often uses `compress=true` (zlib + base64). Decompress:

```bash
# Check if compression is in use first
jq -r '.log.entries[] | select(.request.url | contains("compress=true")) | .request.url' file.har | head -3

# Decompress a single response
jq -r '.log.entries[] | select(.request.url | contains("bsearch")) | .response.content.text' file.har \
  | head -1 \
  | base64 -d \
  | python3 -c "import sys,zlib; sys.stdout.buffer.write(zlib.decompress(sys.stdin.buffer.read()))" \
  | jq . | head -50
```

---

## Log Files

Kibana logs, ECK diagnostics, server logs. Use `rg` (ripgrep), fall back to `grep`.

### Step 1: Shape of the data

```bash
# Time range and size
wc -l file.log
head -1 file.log | cut -c1-100
tail -1 file.log | cut -c1-100
```

### Step 2: Error counts (deduplicated)

Get unique error patterns before reading individual errors:

```bash
# Strip timestamps, truncate, count unique patterns — most common first
rg -i "error" file.log | sed 's/^[0-9T:.,+Z\[\]-]*//' | cut -c1-150 | sort | uniq -c | sort -rn | head -20
```

This is usually more useful than reading errors chronologically.

### Step 3: Drill into specific errors

Once you know which error pattern matters, get context:

```bash
# Search with context (5 lines after match), truncate long lines
rg -A5 "specific error pattern" file.log | cut -c1-300 | head -30

# Stack traces for a specific error
rg -A10 "specific error" file.log | rg -A10 "at .*\.(ts|js):" | head -30
```

### Step 4: Time-bounded search (if timestamps are known)

```bash
rg "2026-01-15T1[0-2]:" file.log | rg -i "error" | cut -c1-300 | head -20
```

---

## JSON Files

Config dumps, diagnostic output, API responses.

### Step 1: Structure overview

```bash
# Top-level keys only
jq 'keys' file.json

# For nested objects, get keys at depth 2
jq 'to_entries | map({key, value_type: (.value | type), child_keys: (if .value | type == "object" then (.value | keys) else null end)})' file.json
```

### Step 2: Targeted extraction

```bash
# Extract specific paths
jq '.elasticsearch.hosts' file.json
jq '.kibana.version' file.json

# Search for error objects anywhere in the tree
jq '.. | objects | select(has("error"))' file.json 2>/dev/null | head -30
```

### NDJSON (newline-delimited JSON)

```bash
# Count lines and peek at structure
wc -l file.ndjson
head -1 file.ndjson | jq 'keys'

# Search for specific content
rg "error" file.ndjson | jq . | head -30
```

---

## YAML Files

YAML is human-readable — use `rg` (or `grep` if unavailable) to search directly, don't convert to JSON.

### Step 1: Identify the file's purpose

```bash
# First few lines usually reveal the kind/type
head -5 file.yml
```

### Step 2: Search for relevant content

Search based on what you learned from the issue — symptoms, component names, config keys:

```bash
# Search for keywords from the issue (error messages, component names)
rg -i "SYMPTOM_KEYWORD" file.yml | head -20

# Common high-signal searches
rg -i "error|warn|fail" file.yml | head -20
rg "image:|version:" file.yml | head -10
rg "resources:|limits:|requests:" file.yml | head -10
```

### Step 3: Read specific sections with context

Once you find a relevant line, grab surrounding context:

```bash
# Show 5 lines before and after a match to see the full YAML block
rg -B5 -A5 "PATTERN" file.yml
```

---

## ECK Diagnostics Bundles

These extract to directories with Kubernetes resources and logs.

```bash
# Explore structure first
find .cursor/sdh/ISSUE/eck-diagnostics-*/ -type f | head -30

# Kibana pod logs — error counts
rg -c -i "error|warn" .cursor/sdh/ISSUE/eck-diagnostics-*/kibana-*/logs/*.log

# Then drill into the noisiest log
rg -i "error|warn" .cursor/sdh/ISSUE/eck-diagnostics-*/kibana-*/logs/SPECIFIC.log | cut -c1-300 | head -30

# Elasticsearch cluster health — status and key indicators only
jq '{status, number_of_nodes, active_shards, unassigned_shards, relocating_shards}' .cursor/sdh/ISSUE/eck-diagnostics-*/elasticsearch-*/*cluster-health* 2>/dev/null

# Pod status
jq '.items[] | {name: .metadata.name, phase: .status.phase, restarts: (.status.containerStatuses[]?.restartCount // 0)}' .cursor/sdh/ISSUE/eck-diagnostics-*/pods.json 2>/dev/null
```

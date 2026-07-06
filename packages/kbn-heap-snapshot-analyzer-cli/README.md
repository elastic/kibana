# @kbn/heap-snapshot-analyzer-cli

Capture and analyze idle Kibana heap snapshots, with per-package and
per-plugin attribution. Optionally captures V8 allocation tracking so
library memory (zod schemas, langchain objects, etc.) rolls up to the
plugin that triggered the allocation.

The analyzer is wired up as `node scripts/heap_snapshot_analyzer.js`
in the repo root.

---

## Capturing an idle snapshot

The recommended setup is a built Kibana with the allocation-tracking 
preload enabled. End-to-end:

### 1. Build Kibana

```sh
node scripts/build --skip-os-packages --skip-docker-ubi --skip-docker-cloud-fips
```

Output lands in `build/default/kibana-<version>-<arch>/`.

### 2. Configure the built Kibana

The built Kibana reads its **own** `config/kibana.yml` (inside the build
directory), not the source one. Edit:

```
build/default/kibana-<version>-<arch>/config/kibana.yml
```

Append encryption keys (so plugins like alerting / encrypted saved objects
aren't disabled, which would skew the baseline):

```yaml
elasticsearch.username: "kibana_system"
elasticsearch.password: "changeme"

xpack.encryptedSavedObjects.encryptionKey: "<32+ char hex>"
xpack.security.encryptionKey: "<32+ char hex>"
xpack.reporting.encryptionKey: "<32+ char hex>"
```

Generate keys:

```sh
node -e "for (let i=0;i<3;i++) console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The `kibana_system`/`changeme` credentials match what `yarn es snapshot`
provisions and avoid the interactive preboot setup flow.

### 3. Start Elasticsearch

```sh
yarn es snapshot
```

Wait for `started`. Verify:

```sh
curl -u elastic:changeme http://localhost:9200
```

### 4. Start Kibana with the allocation-tracking preload

```sh
NODE_OPTIONS="--require $(pwd)/packages/kbn-heap-snapshot-analyzer-cli/src/heap_track_preload.js" \
HEAP_TRACK_FORCE=1 \
HEAP_TRACK_OUTPUT=/tmp/kibana-tracked-idle.heapsnapshot \
./build/default/kibana-*-*/bin/kibana
```

What the env vars do:

- `--require ...heap_track_preload.js` — loads the preload, which opens
  an inspector session and starts allocation tracking.
- `HEAP_TRACK_FORCE=1` — required for built Kibana. The preload normally
  gates on `isDevCliChild=true` (set by the dev CLI fork) so it doesn't
  slow down the launcher and `@kbn/optimizer` workers; built Kibana
  doesn't fork, so the gate has to be opened explicitly.
- `HEAP_TRACK_OUTPUT` — destination path for the snapshot.

You should see in the log:

```
[heap-track] allocation tracking started (PID <N>)
[heap-track] preload installed (PID <N>) — kill -SIGUSR2 <N> to capture
```

If those lines are missing, the preload didn't activate (usually because
`HEAP_TRACK_FORCE=1` wasn't set).

### 5. Wait for idle

Kibana goes through saved-object migrations, plugin starts, and lazy
initialization on first boot. Two reliable signals:

- Log line: `Kibana is now available`
- HTTP probe:

  ```sh
  while [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5601/api/status)" != "200" ]; do
    sleep 2
  done
  ```

After the first 200, give it ~30s of additional idle time so background
tasks settle. Don't open the UI — that triggers plugin startup work and
pollutes the baseline.

### 6. Trigger the snapshot and require.cache dump

Send both signals at the same time:

```sh
kill -SIGUSR2 <kibana-pid>   # heap snapshot
kill -SIGUSR1 <kibana-pid>   # require.cache dump
```

**Always capture both.** The preload patches `Module.prototype.require` from
the moment it loads, so the require.cache dump is fully built up and costs
nothing extra. If you skip it now and later find a suspicious package in the
heap, you'd have to restart Kibana and redo the whole setup to get it.

The heap snapshot writes to `$HEAP_TRACK_OUTPUT`. Watch for:

```
[heap-track] taking snapshot -> /tmp/kibana-tracked-idle.heapsnapshot
[heap-track] snapshot written in 12.3s (1081.3 MB)
```

The snapshot is ~1 GB for a typical full-build idle Kibana.

The require.cache dump writes to `$REQUIRE_CACHE_OUTPUT` (or
`$HEAP_TRACK_DIR/require-cache-<ts>.jsonl`). It is JSONL, one line per
module, with all parents that loaded it:

```
{"id":"<absolute path>","parents":["<absolute path>", ...]}
```

Watch for:

```
[heap-track] require graph dumped (4823 modules, 7201 edges, 1842.3 KB) in 0.04s -> /tmp/require-cache-....jsonl
```

---

## Investigation workflow

These two tools answer different questions. Use them in order:

### Step 1 — heap snapshot: find what's big

```sh
node --max-old-space-size=8192 scripts/heap_snapshot_analyzer.js \
  /tmp/kibana-tracked-idle.heapsnapshot
```

This tells you **what is retained in memory and how much**, attributed to
the package or plugin that owns it. Start here. Look for:

- Unexpected entries in **Retained by Package** / **Retained by Plugin**
- Large entries in **Allocated by Module** that trace back to a library you
  didn't expect to see, or that are bigger than they should be
- Packages whose `Saved` counterfactual is high relative to their size
  (dependency roots that pull in a lot of transitive state)

Output sections:

- **Heap Breakdown by V8 Node Type** — bytes per object kind.
- **Retained by Package** — per-npm-package attribution via
  dominator tree, plus a counterfactual `Saved` column ("how much
  shrinks if this package's directly-owned nodes are removed").
- **Retained by Plugin** — same view rolled up to plugin packages.
- **Allocated by Plugin (allocation site)** — present only when the
  snapshot was captured with allocation tracking. Walks each live
  node's allocation-time call stack to the first plugin frame, so
  schema libraries roll up to the plugin that triggered them.
- **Allocated by Module (allocation site)** — same walk, reports
  third-party `node_modules` libraries (zod, joi, require-in-the-middle,
  etc.). Tells you *where the allocator code lives*.
- **Allocated by Package (allocation site)** — same walk, reports
  `@kbn/*` Kibana packages, skipping library frames so wrapper packages
  get credit for the library bytes they trigger (e.g. `@kbn/connector-schemas`
  shows up with the zod bytes its callers allocated). Tells you *which
  Kibana code triggered the allocations*.

All tables include both percentage and absolute MB columns, so you
can diff snapshots across interventions.

Flags:

- `--json [file]` — emit JSON instead of the human-readable report.
- `--counterfactual=N` — top-N packages/plugins included in the
  counterfactual analysis (default 30).
- `--no-counterfactual` — skip counterfactual analysis (faster).
- `--filter=<regex>` — restrict allocation-site tables to nodes whose
  deepest allocation frame `script_name` matches `<regex>`, and skip
  matching frames when walking the stack so attribution lands on the
  *caller* of the filtered code. Example: `--filter=zod` to attribute
  Zod-allocated state back to the package that defined the schema.

### Step 2 — require.cache dump: trace who loaded it

Once the heap report surfaces a suspicious package, the next question is
**what pulled it in at runtime**. The heap snapshot cannot answer this —
it shows retained objects, not import edges. Static analysis of `import`
statements is unreliable: it misses dynamic `require()` calls and
over-includes `import type` (which produce zero runtime load).

**Why not just use Node's built-in `require.cache`?** Node only records
the *first* parent that loaded each module — every subsequent requirer is
invisible. This is a trap: if you query it and see one package importing
`heavy-lib`, you might conclude "remove that one import and the problem
goes away." But there could be a dozen other importers that loaded it after
the first one, and they're all silently omitted. The fix you'd ship would
have no effect.

The preload patches `Module.prototype.require` before any user code runs
and records *every* `(parent, child)` edge as it happens — the same hook
point as `require-in-the-middle`, just observe-only. The dump therefore
reflects the full multi-parent graph: all importers, not just the first
one in.

```sh
node scripts/require_cache_analyzer.js <dump.jsonl> [flags] [pattern...]
```

**No pattern — survey the full load graph:**

```sh
node scripts/require_cache_analyzer.js /tmp/require-cache-....jsonl
```

Prints total module count and the top 50 `node_modules` packages by number
of loaded files. Useful for a quick sanity check: is the total module count
unexpectedly high? Are heavyweight packages (e.g. `typescript`, `webpack`)
present when they shouldn't be?

**With a pattern — find a specific package and its callers:**

```sh
# Who loads zod at runtime?
node scripts/require_cache_analyzer.js /tmp/require-cache-....jsonl zod

# Who loads zod, with full import chains back to the entry script?
node scripts/require_cache_analyzer.js /tmp/require-cache-....jsonl --chains zod

# Multiple patterns
node scripts/require_cache_analyzer.js /tmp/require-cache-....jsonl --chains zod '@langchain'
```

The `--chains` flag does a BFS upward through every parent of every match,
emitting each unique `(child ← parent)` edge once. Shared upper portions
of chains collapse naturally because edges deduplicate. This is how you
find which plugin or package is the root cause: follow the chain until you
reach a `@kbn/` package that shouldn't depend on the library, or a place
where a lazy import would break the chain.

Flags:

- `--chains` — print full parent chains back to the entry script (BFS,
  deduped edges).
- `--limit=N` — cap matches printed (default 20).
- `--short` — strip the build prefix to keep paths readable.

---

## Capturing without allocation tracking

If you only want a plain heap snapshot (no per-allocation call stacks),
skip the `--require` and use Node's built-in `--heapsnapshot-signal`:

```sh
NODE_OPTIONS="--heapsnapshot-signal=SIGUSR2" ./build/default/kibana-*-*/bin/kibana
kill -SIGUSR2 <pid>
```

The analyzer works on either kind — the alloc-site table is just
omitted when tracking data is absent.

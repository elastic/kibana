# @kbn/heap-snapshot-analyzer-cli

Capture and analyze idle Kibana heap snapshots, with per-package and
per-plugin attribution. Optionally captures V8 allocation tracking so
library memory (zod schemas, langchain objects, etc.) rolls up to the
plugin that triggered the allocation.

The analyzer is wired up as `node scripts/heap_snapshot_analyzer.js`
in the repo root.

---

## Capturing from a source build

The recommended source-build setup uses a built Kibana with the
allocation-tracking preload enabled.

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

What the environment variables do:

- `--require ...heap_track_preload.js` loads the preload, which opens an
  inspector session and starts allocation tracking.
- `HEAP_TRACK_FORCE=1` is required for built Kibana. The preload normally
  gates on `isDevCliChild=true` so it does not slow down the launcher and
  `@kbn/optimizer` workers.
- `HEAP_TRACK_OUTPUT` sets the snapshot destination.

You should see:

```
[heap-track] allocation tracking started (PID <N>)
[heap-track] preload installed (PID <N>) — kill -SIGUSR2 <N> to capture
```

If those lines are missing, the preload did not activate (usually because
`HEAP_TRACK_FORCE=1` was not set).

### 5. Wait for idle

Wait for the `Kibana is now available` log line or poll the status endpoint:

```sh
while [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5601/api/status)" != "200" ]; do
  sleep 2
done
sleep 30
```

The final sleep gives Kibana additional idle time after the first 200 so
background tasks settle. Do not open the UI because that triggers plugin startup
work and pollutes the baseline.

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

A snapshot is about 1 GB for a typical full-build idle Kibana.

---

## Capturing from a serverless Docker image

This workflow runs a published serverless Kibana image against a disposable,
single-node Elasticsearch container. The snapshot is captured through the
Node inspector and analyzed from the Kibana checkout on the host.

The allocation-tracking preload is mounted from the checkout because release
images do not contain it. CDP is used to write the snapshot because
`SIGUSR2` can produce a zero-byte file under Docker Desktop.

### 1. Select a Kibana image

Authenticate to `docker.elastic.co` using
[the Elastic Docker registry instructions](https://docker-auth.elastic.co/github_auth),
then pull the image to measure:

```sh
export KIBANA_IMAGE=docker.elastic.co/kibana-ci/kibana-serverless:git-<12-char-sha>
docker pull "$KIBANA_IMAGE"
```

Use `git-<sha>` for a CI or release build, or `pr-<number>-<sha>` for a PR
build.

To resolve the latest two `deploy@` tags to image names:

```sh
git ls-remote --tags origin 'deploy@*^{}' |
  awk '{
    ref=$2
    sub(/^refs\/tags\/deploy@/, "", ref)
    sub(/\^\{\}$/, "", ref)
    print ref, $1
  }' |
  sort -k1,1nr |
  awk 'NR <= 2 {
    printf "deploy@%s -> docker.elastic.co/kibana-ci/kibana-serverless:git-%s\n",
      $1, substr($2, 1, 12)
  }'
```

Set the solution mode separately from the image:

```sh
export SOLUTION=oblt # oblt | security | es | workplaceai | vectordb
export NAME="kibana-heap-$SOLUTION"
```

### 2. Start Elasticsearch

A single-node Elasticsearch container is sufficient for an idle heap
measurement. Inspect the Kibana version:

```sh
export KIBANA_VERSION=$(
  docker run --rm \
    --entrypoint /usr/share/kibana/node/default/bin/node \
    "$KIBANA_IMAGE" \
    -p "require('/usr/share/kibana/package.json').version"
)
echo "$KIBANA_VERSION"
```

Select an available Elasticsearch image from the same major version:

```sh
export ELASTICSEARCH_IMAGE=docker.elastic.co/elasticsearch/elasticsearch:<compatible-version>

docker rm -f es-for-kibana 2>/dev/null || true
docker run -d \
  --name es-for-kibana \
  -p 127.0.0.1:9200:9200 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  -e xpack.license.self_generated.type=trial \
  -e "ES_JAVA_OPTS=-Xms1g -Xmx1g" \
  "$ELASTICSEARCH_IMAGE"
```

Wait for Elasticsearch:

```sh
until curl -sf http://localhost:9200/_cluster/health >/dev/null; do
  sleep 2
done
```

The exact Elasticsearch version may not be published yet when the serverless
Kibana image is built from `main`. A nearby version from the same major is
sufficient for this measurement because serverless Kibana ignores the
version mismatch. The workflow was validated with Kibana 9.6.0 images against
`elasticsearch:9.5.0-SNAPSHOT`.

### 3. Start the Kibana container

Resolve the Elasticsearch container's address:

```sh
export ES_IP=$(
  docker inspect es-for-kibana \
    --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
)
```

Start Kibana with the inspector exposed. Pass `kibana-docker` and
`--serverless` explicitly so the selected solution configuration is loaded:

```sh
docker rm -f "$NAME" 2>/dev/null || true
docker run --rm -d \
  --name "$NAME" \
  -p 127.0.0.1:5601:5601 \
  -p 127.0.0.1:9229:9229 \
  -v "$(pwd)/packages/kbn-heap-snapshot-analyzer-cli/src/heap_track_preload.js:/usr/share/kibana/heap_track_preload.js:ro" \
  -e "ELASTICSEARCH_HOSTS=http://$ES_IP:9200" \
  -e XPACK_ENCRYPTEDSAVEDOBJECTS_ENCRYPTIONKEY=0123456789abcdef0123456789abcdef \
  -e NODE_OPTIONS="--require=/usr/share/kibana/heap_track_preload.js --inspect=0.0.0.0:9229" \
  -e HEAP_TRACK_FORCE=1 \
  "$KIBANA_IMAGE" \
  /usr/local/bin/kibana-docker --serverless="$SOLUTION"
```

The encryption key must contain at least 32 characters. Otherwise related
plugins are disabled and the baseline is skewed. `HEAP_TRACK_FORCE=1` is
required because the production image does not run through the development
CLI child-process gate.

Confirm that allocation tracking started:

```sh
docker logs "$NAME" 2>&1 | grep '\[heap-track\]'
```

The output should include:

```
[heap-track] allocation tracking started (PID <N>)
[heap-track] preload installed (PID <N>) — kill -SIGUSR2 <N> to capture
```

### 4. Wait for idle

Kibana goes through saved-object migrations, plugin starts, and lazy
initialization on first boot. Two reliable signals:

- Log line: `Kibana is now available`
- HTTP probe:

  ```sh
  until docker logs "$NAME" 2>&1 | grep -q 'Kibana is now available'; do
    sleep 3
  done

  until [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5601/api/status)" = "200" ]; do
    sleep 2
  done
  sleep 30
  ```

The final sleep gives Kibana additional idle time after the first 200 so
background tasks settle. Don't open the UI — that triggers plugin startup work
and pollutes the baseline.

Allocation tracking substantially slows startup. Five minutes to reach
available is normal for a full serverless image.

Confirm that the inspector is reachable:

```sh
curl -sf http://localhost:9229/json
```

### 5. Capture through the inspector

On macOS, sending `SIGUSR2` into a Docker container can leave a zero-byte
snapshot. Capture through the Chrome DevTools Protocol (CDP) instead. This
also forces a garbage collection immediately before capture, making
comparisons more repeatable:

```sh
export HEAP_SNAPSHOT="/tmp/kibana-$SOLUTION.heapsnapshot"

node <<'NODE'
const CDP = require('chrome-remote-interface');
const fs = require('fs');

(async () => {
  const client = await CDP({ host: '127.0.0.1', port: 9229 });
  const output = fs.openSync(process.env.HEAP_SNAPSHOT, 'w');

  try {
    client.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) =>
      fs.writeSync(output, chunk)
    );
    await client.HeapProfiler.enable();
    await client.HeapProfiler.collectGarbage();
    await client.HeapProfiler.takeHeapSnapshot({ reportProgress: false });
  } finally {
    fs.closeSync(output);
    await client.close();
  }

  console.log(`Wrote ${process.env.HEAP_SNAPSHOT}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
NODE
```

Run this command from a bootstrapped Kibana checkout; the root package
provides `chrome-remote-interface`. Because the preload started allocation
tracking during process startup, the CDP snapshot includes allocation traces.

Expect a file hundreds of MB in size. Verify it before running the analyzer:

```sh
ls -lh "$HEAP_SNAPSHOT"
test -s "$HEAP_SNAPSHOT"
```

Serverless snapshots are normally smaller than snapshots from the full
stateful distribution. Compare snapshots captured with the same image type,
project, configuration, idle period, and GC procedure.

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
  "$HEAP_SNAPSHOT"
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

### Choosing an analysis view

Choose the view based on the question:

- **What changed between two snapshots?** Use `--compare=<baseline>`.
  Its self-size buckets are mutually exclusive and additive, so the rows
  reconcile exactly with the total heap delta. Use this as the primary view
  for regressions.
- **What physical kind of memory changed?** Start with the V8 node-type
  breakdown to distinguish strings, arrays, compiled code, objects, and other
  runtime structures.
- **Which package or plugin dominates memory now?** Use the retained tables.
  Retained boundaries can contain nested boundaries owned by other packages,
  so do not add rows together or subtract them from total heap size.
- **What would disappear if a package were absent?** Use counterfactual
  `Saved`. This models an independent removal scenario for each package.
  Results can overlap and are not additive; increasing `--counterfactual=N`
  also increases analysis time.
- **Which code created the surviving objects?** Use allocation-site views.
  These require a snapshot captured with allocation tracking.
- **Who called a particular allocator?** Use `--filter=<regex>` to select
  allocations made by that library and walk past its frames to the caller.

### Understanding allocation-site views

Allocation tracking records the call stack that was active when each heap
object was created. The analyzer walks that stack and presents the same live
objects through three alternative rollups:

1. **Module** finds the first package frame, including third-party modules.
   This identifies allocator code such as `zod` or
   `@opentelemetry/sdk-node`.
2. **Package** skips third-party frames and finds the first `@kbn/*` frame.
   This identifies the Kibana package that triggered the allocation.
3. **Plugin** finds the first plugin-package frame. This identifies the
   product/plugin area responsible for investigating it.

For example, an allocation stack might be:

```text
zod creates schema objects
→ @kbn/connector-schemas defines the schema
→ @kbn/actions-plugin loads the connector
```

Those objects appear under `zod` in the Module view,
`@kbn/connector-schemas` in the Package view, and `@kbn/actions-plugin` in
the Plugin view. These are alternative attributions of the same bytes and
must not be added together.

Allocation-site attribution has several limitations:

- It includes only objects still alive when the snapshot is captured.
- Objects created before allocation tracking started are reported as
  untracked.
- It identifies who created an object, not who currently retains it.
- Runtime loaders and instrumentation wrappers can obscure callers.
  `--filter=<regex>` is useful when investigating one known allocator.

All tables include percentage and absolute MB columns.

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
- `--compare=<snapshot>` — treat `<snapshot>` as the baseline and emit an
  additive self-size diff grouped by allocation source and V8 node type.
- `--compare-limit=N` — number of source-diff rows in human-readable output
  (default 100). JSON output always contains every row.

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

## Cleanup

```sh
docker rm -f "$NAME" es-for-kibana
```

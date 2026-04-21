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

### 6. Trigger the snapshot

```sh
kill -SIGUSR2 <kibana-pid>
```

The preload writes to `$HEAP_TRACK_OUTPUT`. Watch for:

```
[heap-track] taking snapshot -> /tmp/kibana-tracked-idle.heapsnapshot
[heap-track] snapshot written in 12.3s (1081.3 MB)
```

The snapshot is ~1 GB for a typical full-build idle Kibana.

---

## Analyzing

```sh
node --max-old-space-size=8192 scripts/heap_snapshot_analyzer.js \
  /tmp/kibana-tracked-idle.heapsnapshot
```

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

All tables include both percentage and absolute MB columns, so you
can diff snapshots across interventions.

Flags:

- `--json [file]` — emit JSON instead of the human-readable report.
- `--counterfactual=N` — top-N packages/plugins included in the
  counterfactual analysis (default 30).
- `--no-counterfactual` — skip counterfactual analysis (faster).

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

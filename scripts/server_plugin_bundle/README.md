# Server plugin rspack bundle (experiment)

Not for merge. Builds one production `plugins.cjs` for server-enabled plugins and preloads it in a from-source serverless security boot, so idle heap can be compared with `node scripts/heap_snapshot_analyzer.js`.

The bundle and heap snapshot are written under `/tmp/kibana-server-plugin-bundle` (override with `KBN_PLUGIN_BUNDLE_OUT`). They are not part of this tree.

## Reproduce

From a bootstrapped checkout, on the Node version in `.nvmrc`:

```sh
python3 scripts/server_plugin_bundle/generate_entry.py
node --max-old-space-size=16384 scripts/server_plugin_bundle/compile.js
node scripts/server_plugin_bundle/latin1ify.js /tmp/kibana-server-plugin-bundle/plugins.cjs
node --check /tmp/kibana-server-plugin-bundle/plugins.cjs
KBN_NODE="$(command -v node)" KBN_SERVER_PORT=5602 bash scripts/server_plugin_bundle/launch.sh
```

Wait for `Kibana is now available`, then `kill -USR2 <pid>`. Analyze the snapshot with:

```sh
node --max-old-space-size=16384 scripts/heap_snapshot_analyzer.js \
  /tmp/kibana-server-plugin-bundle/bundle-security.heapsnapshot \
  --no-counterfactual
```

`latin1ify.js` is required. One codepoint above U+00FF stores the whole script source as UTF-16. SWC `asciiOnly` escapes ordinary strings; `dedent` reads template raw text, so those characters are rewritten to `${"\uXXXX"}`.

## Measured boot

Node 24.21.0, `experiment/artifact-smoke-heap-812` at `d70994358a96` (main plus the 812MB package-test cap), Elasticsearch 9.4.0 at `127.0.0.1:9201`, port 5602. Snapshot about a minute after available. Analyzer root retained size (idle heap, bytes / 1e6): **687.2 MB**.

`plugins.cjs` was 70,227,316 bytes and Latin-1. The snapshot held two copies, `code.source` and `fileContentsCache`, at 70,227,336 bytes each (140.5 MB together).

Compared with 9.6.0-SNAPSHOT cloud images measured the same way:

| Snapshot | Idle heap |
| --- | ---: |
| 9.6.0-SNAPSHOT (7 Oct) `kibana-cloud:9.6.0-SNAPSHOT-385667d42e8b` | 726.2 MB |
| 9.6.0-SNAPSHOT (8 Oct) `kibana-cloud:9.6.0-SNAPSHOT-f1fda9147121de669229ad06764cee9c944b5396` | 729.7 MB |
| This source boot, plugins bundled | 687.2 MB |

That is 39.0 MB and 42.5 MB under those images. The boots are not a matched A/B: those rows are cloud images, this one is a source boot with only the plugin graph bundled.

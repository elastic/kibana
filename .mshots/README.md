# Memory page visual + interaction harness

Renders the Semantic Memory page in a **real browser** against a bundle built
from the real component source, then screenshots and clicks through it.

## Why this exists

Kibana's Jest setup configures Emotion with `includeStyles: false`
(`src/platform/packages/shared/kbn-test/src/jest/setup/emotion.js`), so a jsdom
render emits **zero** CSS. A screenshot of a jsdom render is unstyled and tells
you nothing about layout. EUI ships no stylesheet either — everything is
Emotion, generated at runtime.

So the harness bundles the component with esbuild and runs it in Chromium,
where Emotion does its normal job. The screenshots are real.

It also covers what jsdom cannot: real layout, real hit-testing, real EUI
overlays, and real focus behaviour.

## Usage

```sh
node .mshots/build.mjs       # bundle the component (needed after source edits)
node .mshots/shoot.mjs       # write PNGs to $MEMORY_SHOT_DIR (default /tmp/mshots)
node .mshots/interact.mjs    # click through the page, 12 checks, non-zero on failure
```

`interact.mjs` exits non-zero if any check fails, so it can be wired into CI
once a browser is available there.

## What is stubbed

Only what cannot exist outside a booted Kibana:

- `use_memory` hooks — return fixture rows, honouring the `active`/`archived`
  filter the way the real hook does by asking the server.
- `use_kibana` — supplies the Nightshift `investigationsClient` used for lineage.

The components under test are **not** stubbed or modified.

## Limits

- No real Elasticsearch, no real auth, no Space isolation. Those still need a
  Scout spec against a running stack.
- The harness cannot see Kibana's chrome, so it validates the Memory page only.

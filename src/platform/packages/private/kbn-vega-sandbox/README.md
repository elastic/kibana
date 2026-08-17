# @kbn/vega-sandbox

Self-contained webpack bundle (`vega_sandbox.bootstrap.js`) that renders Vega/Vega-Lite
inside an opaque iframe. Parents talk to the frame with a versioned `postMessage`
protocol (`VEGA_SANDBOX_PROTOCOL_VERSION`, `isVegaSandboxOutboundMessage`).

Core serves the artifact at `/bundles/kbn-vega-sandbox/`. The bundle does not use
Kibana optimizer globals or shared-deps externals.

## Try it

```
yarn start --run-examples
```

Open **Developer Examples → Vega sandbox**. That playground hosts one
`<iframe sandbox="allow-scripts">` and logs inbound and outbound protocol messages in
one comment list. **Render** draws a bar chart; **Render filter example** lets you click a
bar so the parent filters the inline data and sends a new `render`; **Resize** toggles
the iframe height without a new `rendered`. Matching `render` / `rendered` `renderId`s are the
completion signal PNG/PDF reporting wait on. It is not the production visTypeVega host.

visTypeVega sandbox integration (feature flag, dashboard panels, inspector) is a
follow-up.

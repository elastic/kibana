# An Isomer runtime as a remote render service

A proposal for running an Isomer runtime beside [page-render-service](https://github.com/elastic/page-render-service) on serverless, so that dashboard printing, Agent Builder, Nightshift and anything else that needs a PNG or PDF of a composition gets it from one instance per cluster rather than from a drawing process inside every Kibana. It reviews what page-render-service already settled, what this branch now has running locally, how to keep the service's Isomer in step with Kibana's, and the steps from here.

Status, Oct 30 2026: a local Docker image built from this checkout renders Kibana's packs end to end (`x-pack/platform/plugins/shared/isomer/scripts/render_service/`). Nothing is deployed, and nothing here touches page-render-service's repository.

## Why a service

The memory findings on this branch put the floor of a drawing process at about 500 MB RSS: jsdom, Skia, Elastic Charts, takumi and the packs, before the first dashboard. Per-draw cost is flat and small. That is the same shape of argument page-render-service makes for Chromium: a fixed, large, mostly idle cost that should not sit on every Kibana node on the chance someone exports a dashboard, and that should patch on its own cadence. Moving Isomer out follows the path they have already cut: ECP placement on every serverless application cluster, UIAM caller authentication, mTLS, the Elastic Pod Autoscaler, gpctl promotion with smoke gates, and the overview cluster's dashboards and SLOs.

The second reason is consumers that are not Kibana at all. Nightshift and a Slack relay need the same PNGs without a Kibana in the loop; a service with a vocabulary contract serves them the way it serves Kibana.

## What page-render-service settles, and what carries over

The repository is small (about 20 source files, Fastify, Playwright, Zod) and its README is the design document. The parts that transfer, and how the scaffold on this branch answers each:

| page-render-service | Isomer render service |
|---|---|
| One synchronous `POST /v1/render-page` returning PDF or image bytes; errors as JSON with a `phase`; the OpenAPI spec generated from the Zod schemas and committed, with a backward-compatibility check in CI. | `POST /v1/render-composition` returning bytes, errors as JSON with a `code`. The request carries the composition and the render host's draw options as data; no URL, no scripts, no CSS. The spec should be generated the same way once the contract settles. |
| One render at a time per pod, fixed. A request that arrives mid-render gets `429` at once, no queue, no `Retry-After`; the caller owns its retry schedule. `503` while draining. Both carry a rejection header and `Connection: close`, because the Kubernetes Service balances connections, not requests. | Same, verbatim: `429` saturated, `503` draining, `x-isomer-render-service-rejection`, `Connection: close`. |
| Chromium is launched with the pod and `/readyz` fails until it is up, so a scale-up never pays the launch inside a render. | The render process is forked at start and draws a warm-up composition; `/readyz` fails until it has. Warm-up takes about 3 s on this laptop. |
| Chromium is recycled after every render so a page that compromised it never sees another tenant's page; a render that overruns the hard limit replaces it. | A draw that overruns `RENDER_TIMEOUT_MS` kills the render process, and the next draw starts a new one. Per-render recycling is not on by default; see hardening below. |
| SIGTERM drains: readiness fails, new renders are refused, the one in flight finishes, then the pod exits. `terminationGracePeriodSeconds` is derived from the render timeout. | Same. |
| The busy signal `page_render_demand` on `/metrics`, the share of a window spent rendering plus a weighted term for the seconds refused reports will wait; EPA sums it across pods. | `isomer_render_demand` on `/metrics`, the rendering share; the waiting term is the caller's to send and is not wired yet. |
| Chromium runs in a sidecar container with no TLS key, its own user, read-only root filesystem, seccomp profile and memory limit. | The render process is already a separate process owning every engine; making it the sidecar is the same move. It needs no browser sandbox: nothing it runs is fetched from the network. |
| `KIBANA_HOST_PATTERN` and the egress policy exist because the service fetches a caller-supplied URL. | There is no URL. The service needs no egress at all, which removes the SSRF surface and the public-internet rule from the network policy. The one code-like input is a Vega spec, which the Vega pack evaluates with `vega-interpreter` rather than `eval`. |
| Caller authentication: Kibana presents a UIAM ephemeral token over mTLS, the service forwards the token and the certificate's SANs to UIAM. | Unchanged; the scaffold has no authentication and would sit behind the same hook. |
| ECS JSON logs on stdout, OpenTelemetry metrics and traces to the cluster's EDOT gateway, `traceparent` continued from the caller. | ECS JSON logs on stdout. OTel is a copy of their loader. |
| Kibana-agnostic: one version of the service serves every Kibana version in the fleet. | The hard part. See the next section. |
| Kibana calls it through a small private plugin, `pageRenderScreenshotting`, a drop-in `ScreenshottingStart`: ephemeral UIAM token, mTLS dispatcher, a retry ladder keyed on the report's age, `x-render-retry-interval-ms` and `x-report-id` headers, outcome classes for Task Manager. | The `isomer` plugin's `getRenderHost()` returns a remote `RenderHost` when `xpack.isomer.renderService.url` is set: the same draw options over HTTP, `expects.vocabulary`, `x-render-retry-interval-ms`, a doubling retry on `429` and `503`, and the forked process as the fallback. Token and dispatcher are still to add. |

Two things in their repository are worth borrowing wholesale: the Helm chart, which encodes every platform requirement (attribution labels, `runAsNonRoot`, the Cilium egress rules, EPA, the PDB, certificate issuance), and the Buildkite shape (lint, test, OpenAPI drift, chart publish, drivah image, gpctl promote, cluster-mgmt for o11y).

## What runs now

`scripts/render_service/bundle.js` runs esbuild over the plugin's render process and a small service file and writes a Docker context. Kibana's own packages are inside the two bundles; the published packages they sit on stay external and install from npm in the image, pinned to this checkout's versions.

| | |
|---|---|
| Bundles | `service.js` 933 KB, `main.js` (the render process) 1,028 KB |
| Externals installed in the image | `@elastic/isomer-sdk`, `-runtime`, `-image-takumi`, `@elastic/distillate`, React, Elastic Charts, EUI's theme packages, jsdom, Vega, `@napi-rs/canvas`, plus their peers |
| Assets | Kibana's Inter and Elastic UI Numeric fonts, the world outlines fixture, at their checkout paths under `dist/kibana` |
| Image | `node:24-slim`, `tini`, unprivileged user, 750 MB |
| Warm-up | about 2 s from listen to the first drawn PNG, in the container |
| Container memory | 443 MiB once warm, 598 MiB after a run of chart PDFs, with the default 256 MB heap cap on the render process |
| Draws, in the container on an arm64 laptop | components examples to PNG: 29 ms; components and charts examples to PDF: 1,031 ms for the first, then 360 to 530 ms |

The contract and configuration are in the scaffold's README. Three things it does that page-render-service has no equivalent for:

- `GET /status` and `GET /v1/capabilities` report the Isomer package versions, the runtime's capabilities, and a vocabulary digest per pack.
- A request may carry `expects.vocabulary`; a mismatch is `409 VOCABULARY_MISMATCH` with both digests, before validation and before the render slot.
- The composition is validated in the service process against the packs before it can take the render slot; an unknown primitive is `400 INVALID_COMPOSITION` with the runtime's errors.

What it does not do: authenticate, recycle the render process per tenant, export OTel, or take a waiting term for autoscaling.

## Keeping two Isomers in step

Three things have to agree between the Kibana that composes and the service that draws:

1. **The SDK and runtime version.** The envelope schema, the validation passes, the input budget. Both pin exactly.
2. **The pack vocabulary.** Which node types exist and what each accepts. A composition that validates in Kibana must validate in the service. This is what the vocabulary digest covers.
3. **The renderers and engines.** A schema-equal pack with a different renderer, or a different Elastic Charts or takumi, draws different pixels. The digest does not cover this; the build SHA and package versions on `/status` do.

The failure modes are asymmetric. A Kibana newer than the service sends a type or a field the service's strict schemas reject: a clean `400`, and nothing to render with. A service newer than Kibana is fine for additive changes and needs a migration for breaking ones. That second case is exactly [elastic/isomer#201](https://github.com/elastic/isomer/issues/201): an integer version per pack, an ordered chain of migrations, a `packs` stamp on every composition, `runtime.upgrade` on read, and a merge-time check that a breaking vocabulary change bumps the version. The digest, computed by the same `server/vocabulary.ts` on both sides, is the stand-in for that issue's `vocabulary/<id>.v<N>.json` snapshot, and `409` is the stand-in for `PACK_VERSION_UNSUPPORTED`. The issue is a prerequisite for anything past the demo, and it is also what makes stored compositions survive Kibana upgrades, so it pays twice.

The constraint that decides the architecture comes from page-render-service's own README: one instance per cluster serves every project on it, and projects on one cluster run different Kibana builds. So "keep the service in step with Kibana" has no single Kibana to be in step with. Three ways to live with that:

**A. Lockstep.** The image is built from the Kibana commit, Kibana compares `vocabulary` and refuses or falls back on a mismatch. This is what the scaffold does. It is right for the demo and for a single-version deployment, and wrong for a shared instance: whichever Kibana build the service was cut from, the others get `409`.

**B. A compatibility window, with #201.** The service is built from Kibana's `main` on every merge, as the `kbn-ui` publish pipeline already builds and publishes `@kbn/ui-*` packages, and promoted at least as fast as Kibana. Packs carry versions and migrations; the service upgrades every composition on read; a composition stamped newer than the service is `409`, and Kibana retries later or draws locally. The rollout rule is the one #201's example 12 states, inverted: ship the service that reads version N before the Kibana that writes it. gpctl's qa, staging and production chain with a human approval before production cannot promise that ordering against Kibana's own continuous deploys, so B needs either an automated promotion for the service or a Kibana that tolerates `409` for the gap.

**C. The vocabulary travels with the request.** The service holds only the SDK, the runtime and the engines, which change on Isomer's release cadence. Kibana's packs are published as one content-addressed bundle, `@kbn/isomer-packs@0.0.0-<hash>`, the way `kbn-ui` stamps its tarballs, and a request names the hash. The service fetches the bundle once, instantiates a runtime for it in a render process keyed by hash, and keeps a small LRU of them. Then one service serves every Kibana version on the cluster, which is the property page-render-service was designed for, and the remaining compatibility question is the pack's SDK peer range plus `PACK_CONTRACT_VERSION`, both from #201. The cost is that pack code runs in the service, which is what the per-hash render process and the recycle policy are for, and that the bundle must come from Kibana's CI alone, from an allow-listed registry, which the network policy can hold to a single origin.

Recommendation: A for the demo, as built. B as the contract, because #201 is needed in every path and because upgrade-on-read is also the answer for stored compositions. C as the deployment architecture once the service is shared across Kibana builds, which on serverless is the only case. B and C are not alternatives: C's bundle still carries B's versions.

## Publishing the packs

`@kbn/isomer-*` are private workspace packages today. The `kbn-ui` practice fits them with little change: a `packaging/scripts/build.sh` per package, `_tooling/stamp_version.js` for a content-hash pre-release version, `metadata.js` for the git SHA, and `.buildkite/scripts/steps/kbn_ui_publish.sh` to push affected tarballs to the internal Artifactory on merge, refusing duplicates by version. One tarball for the five packs plus the theme and `createRuntime`, with `@elastic/isomer-sdk` as a peer, is enough; the split `bundle.js` makes between bundled and external is the package boundary. The service's image then installs `@kbn/isomer-packs@<version>` instead of copying a bundle, and in option C fetches it by hash at runtime.

## Next steps

Each is a small PR or a conversation, in order.

1. **Share this scaffold and this document** with Cameron Banta's team in `#page-render-service` and ask the questions below. The decision that shapes everything else is whether the Isomer service is a second Deployment in their repository and chart, sharing catalog, placement, UIAM, TLS and EPA, or a sibling repository cloned from theirs.
2. **Kibana client.** Done on this branch, without authentication: with `xpack.isomer.renderService.url`, the `isomer` plugin's `getRenderHost()` returns a remote `RenderHost` (`server/render_host/remote.ts`) that posts the same draw options to the service with `expects.vocabulary` from the local runtime, retries `429` and `503` with a growing interval until `renderService.timeoutMs`, and, with `serverDraw` also on, falls back to the forked process when the service is unavailable or on another vocabulary. The dashboard PDF route's `host: true` reaches it unchanged. Still to add: the UIAM ephemeral token and mTLS dispatcher as `pageRenderScreenshotting` does them, and report ids for the service's logs.
3. **Land #201** in isomer, then adopt it in the Kibana packs: a version and `vocabulary/` snapshot per pack, `checkPackVocabulary` in each pack's tests, `runtime.stamp` at the draw and composition routes, `runtime.upgrade` in the service. The digest on `/status` becomes the pack versions.
4. **Package the packs** with the `kbn-ui` tooling and publish on merge. Move the service's build from this checkout's esbuild bundle to the published package, in its own repository, with the Isomer packages pinned and Renovate bumping them.
5. **Harden to page-render-service's bar.** Recycle the render process per render and measure the warm-up it costs, or pool one spare. The sidecar split with its own user, read-only filesystem and memory limit. Requests and limits from the memory findings: about 520 MB RSS at rest, so a 768 Mi request and a 1 Gi limit to start. OTel metrics with their names, the waiting term in the busy signal, the OpenAPI generation and drift check, and a review of the Vega path as the only interpreted input.
6. **Measure through the service.** Point the memory probe (`scripts/probe_memory.js`) at the service and compare time and memory per dashboard with the in-process path, on the Flights, Logs and eCommerce dashboards.
7. **Option C**, once a shared instance is in sight: the per-hash runtime registry, the bundle fetch from the allow-listed registry, and the LRU.

## Questions for the page-render-service team

- Would an Isomer Deployment live in `elastic/page-render-service` (one chart, two services) or in its own repository on the same template? Their README's "Kibana-agnostic" principle argues for a sibling, their platform work argues for sharing.
- Is UIAM's project service account the right caller identity when the caller is Nightshift or a relay rather than a Kibana?
- EPA with a different busy signal name, or the same metric name behind a different Deployment?
- The browser container's seccomp profile is for Chromium's sandbox; a Node render process needs `RuntimeDefault` only. Anything in the pod template that assumes the sidecar is a browser?
- For option C: is there an internal registry or the Kibana CDN that a cluster-internal service can reach for a content-addressed bundle, within the default-deny egress policy?

## Known gaps in the scaffold

- No authentication, OTel, or per-render recycling.
- The image installs the externals with `npm install --legacy-peer-deps`, because Kibana's pnpm install is not strict about peers either; Elastic Charts declares an older `moment-timezone` range than Kibana pins. It also re-applies Kibana's `vega-canvas` patch, which resolves Vega's browser build under Node because the Node build's top-level `await import('canvas')` cannot be required from CommonJS. A published packs package would carry both facts in its own manifest.
- The host run must be on Node 24, Kibana's pinned version. On Node 22 every chart fell back to its data table.
- Maps draw with the test fixture's world outlines only; EMS boundaries and basemaps are loaded in Kibana's process and would have to be sent with the request or fetched by the service.
- `/v1/examples` is a convenience for the smoke test and would not ship.

# PR Review: `fix-product-proxy-url` — Issue #274455

**Branch:** `fix-product-proxy-url`  
**Base:** `main`  
**Commit:** `6a44dd13bbd7` — Refactor package installer to utilize ProxyAgent for proxy handling and add tests for artifact repository proxy functionality  
**Issue:** [elastic/kibana#274455](https://github.com/elastic/kibana/issues/274455) — `xpack.productDocBase.artifactRepositoryProxyUrl` silently ignored (undici ignores `agent`)

## Does this PR fix #274455?

**Yes, for the two bugs described in the issue.**

| Issue requirement | Status | Evidence |
|---|---|---|
| Replace `agent` with undici `ProxyAgent` + `dispatcher` | Fixed | `proxy.ts` now returns `{ dispatcher: new ProxyAgent({ uri }) }`; tests assert no `agent` key |
| Forward `artifactRepositoryProxyUrl` in `ensureUpToDate()` | Fixed | `getArtifactRepositoryOptions()` centralizes URL + proxy; used by `ensureUpToDate`, `installAll`, retries, and Security Labs fetch paths |
| Call sites pass dispatcher to native `fetch` | Fixed | `fetch_artifact_versions.ts` and `download.ts` unchanged in shape but now receive working options |

**Validation run:**
- `node scripts/jest` on `proxy.test.ts`, `fetch_artifact_versions.test.ts`, `package_installer.test.ts` — **25/25 passed**
- `node scripts/check_changes.ts` — **passed**

## Changed files summary

| Area | Files | Notes |
|---|---|---|
| Core fix | `proxy.ts`, `proxy.test.ts` | undici `ProxyAgent` + `dispatcher` |
| Secondary fix | `package_installer.ts`, `package_installer.test.ts` | `getArtifactRepositoryOptions()` helper + proxy forwarding tests |
| Call-site coverage | `fetch_artifact_versions.test.ts` | Asserts `ProxyAgent` dispatcher on fetch |
| Minor | `plugin.ts` | Deduplicate config read (cosmetic) |
| **Unrelated** | `ml/jest.config.js`, `ml/public/jest_setup.ts`, 2 ML snapshot files | Should not ship with this fix |

---

## Issue 1/5: Unrelated ML plugin changes weaken calendar header snapshot

- **Urgency:** High
- **Why it matters:**
  - Four ML files are unrelated to product-doc proxy behavior and expand review/merge risk.
  - `header.test.js.snap` drops the `mlCalendarListRefreshButton` subtree while `header.tsx` still renders the Refresh button — the snapshot no longer validates that UI.
  - Bundling unrelated test infra makes regressions in ML harder to attribute and may block backport cherry-picks.
- **Evidence:**
  - `x-pack/platform/plugins/shared/ml/public/jest_setup.ts` — new global `@kbn/app-header` mock
  - `x-pack/platform/plugins/shared/ml/public/application/settings/calendars/list/__snapshots__/header.test.js.snap` — Refresh button removed from expected output
  - `header.tsx` lines 83–93 still define `data-test-subj="mlCalendarListRefreshButton"`
- **Proposed fix:**
  1. Revert all ML changes from this branch (`jest.config.js`, `jest_setup.ts`, both snapshot files).
  2. If ML jest setup is needed for local runs, land it in a separate PR with an explanation and corrected snapshots.
  3. Keep this PR scoped to `product_doc_base` only.
- **How to verify:**
  - `git diff main...HEAD -- x-pack/platform/plugins/shared/ml` is empty
  - Run ML calendar header tests and confirm snapshot includes Refresh button

---

## Issue 2/5: New `ProxyAgent` created on every fetch call

- **Urgency:** High
- **Why it matters:**
  - `getFetchOptions()` constructs a fresh `ProxyAgent` per invocation; background `ensureUpToDate` plus multi-artifact installs can trigger many sequential fetches.
  - Unlike `build_custom_fetch.ts` (MCP stack connector), which builds one dispatcher and reuses it, this pattern risks socket/TLS session churn and potential file-descriptor pressure in long-running Kibana processes.
  - Air-gapped deployments (the primary audience for this fix) often run recurring update checks.
- **Evidence:**
  - `proxy.ts` — `getProxyDispatcher()` called inside `getFetchOptions()` on every call
  - `download.ts:31-32`, `fetch_artifact_versions.ts:38` — each HTTP request calls `getFetchOptions`
  - Reference pattern: `build_custom_fetch.ts` reuses a single `dispatcher` for the fetch closure
- **Proposed fix:**
  1. Cache a module-level or `PackageInstaller`-scoped `ProxyAgent` keyed by `artifactRepositoryProxyUrl` (and TLS options if added later).
  2. Return the cached dispatcher from `getFetchOptions` instead of allocating each time.
  3. Add a test that multiple calls with the same proxy URL reuse the same dispatcher instance (or document intentional per-call creation with `close()` lifecycle).
- **How to verify:**
  - Unit test: two `getFetchOptions` calls with same proxy URL return same dispatcher reference
  - Manual/soak: repeated `ensureUpToDate` under proxy config without rising open socket count

---

## Issue 3/5: Download path lacks direct proxy dispatcher test

- **Urgency:** Medium
- **Why it matters:**
  - Issue #274455 explicitly cites `download.ts:32` as a failing call site (`TypeError: fetch failed` in air-gapped envs).
  - `download.test.ts` only asserts `fetch(url, {})` with no proxy URL; proxy coverage is indirect via mocked `downloadToDisk` in `package_installer.test.ts`.
  - A regression in `download.ts` wiring would not be caught by current unit tests.
- **Evidence:**
  - `download.test.ts:64` — `expect(fetchMock).toHaveBeenCalledWith(mockFileUrl, {})`
  - `package_installer.test.ts` mocks `downloadToDisk` — never exercises real fetch + dispatcher path
  - `fetch_artifact_versions.test.ts` has the proxy dispatcher test; `download.test.ts` does not
- **Proposed fix:**
  1. Add `download.test.ts` case mirroring `fetch_artifact_versions.test.ts`: pass `artifactRepositoryProxyUrl`, assert `fetch` receives `dispatcher instanceof ProxyAgent`.
  2. Optionally add test for `Response body is null` error path with proxy options present.
- **How to verify:**
  - `node scripts/jest .../download.test.ts` passes with new proxy case

---

## Issue 4/5: Proxy behavior change vs. previous `https-proxy-agent` implementation

- **Urgency:** Medium
- **Why it matters:**
  - Pre-fix code set proxy `Host` header to the target endpoint (`endpointParsed.host`) and extracted basic auth from the proxy URL explicitly.
  - New code passes only `uri: proxyUrl` to undici `ProxyAgent`; no custom `Host` header, no explicit auth parsing.
  - Most standard HTTP CONNECT proxies work with undici defaults, but enterprise proxies that relied on the old Host override or non-URI auth schemes may behave differently.
- **Evidence:**
  - `main` `proxy.ts` — `headers: { Host: endpointParsed.host }`, `auth` from `proxyParsed.username/password`
  - Current `proxy.ts` — `new ProxyAgent({ uri: options.proxyUrl, ... })` only
  - No integration/FTR test against a real proxy server in this PR
- **Proposed fix:**
  1. Document in PR/issue comment that proxy auth must be embedded in the URL (`http://user:pass@host:port`) per undici conventions.
  2. If Elastic customers used Host-header-sensitive proxies, consider restoring default `headers: { host: new URL(targetUrl).host }` on `ProxyAgent` to match prior behavior.
  3. Add manual test plan entry: Kibana behind corporate proxy downloading artifacts end-to-end.
- **How to verify:**
  - Manual test with configured `artifactRepositoryProxyUrl` against a local mitmproxy/squid instance
  - Confirm artifact install completes (not just version listing)

---

## Issue 5/5: `ArtifactRepositoryProxySettings` TLS/header options are dead code

- **Urgency:** Medium
- **Why it matters:**
  - `proxy.ts` exports `ArtifactRepositoryProxySettings` with `proxyHeaders` and `proxyRejectUnauthorizedCertificates`, and `getProxyDispatcher` implements them — but `getFetchOptions(targetUrl, proxyUrl?)` never accepts or forwards these fields.
  - Same limitation existed before (public API was always just a URL string), but the refactor adds TLS branching that can never run, which misleads future maintainers.
  - Customers with TLS-intercepting proxies may assume certificate relaxation is available when it is not wired to config.
- **Evidence:**
  - `proxy.ts:10-14` — extended settings interface
  - `proxy.ts:40-47` — `getFetchOptions` only takes `proxyUrl?: string`
  - `config.ts` — only `artifactRepositoryProxyUrl` is defined; no header/TLS settings
- **Proposed fix:**
  1. Either remove unused fields from `ArtifactRepositoryProxySettings` until config supports them, or
  2. Wire through if product requirements need TLS bypass (align with `xpack.actions` proxy SSL settings pattern).
  3. Add unit tests for `proxyRejectUnauthorizedCertificates: false` if kept.
- **How to verify:**
  - Type/interface matches actual config surface
  - Tests cover any supported TLS override path

---

## Top recommended next actions

1. **Drop unrelated ML changes** from this branch before merge; keep the PR focused on #274455.
2. **Merge the core fix** — undici `dispatcher` + `getArtifactRepositoryOptions()` correctly addresses the reported root cause and secondary bug.
3. **Cache/reuse `ProxyAgent`** instances to avoid per-fetch allocation in background update loops.
4. **Add `download.test.ts` proxy dispatcher test** to guard the exact failure path cited in the issue.
5. **Run a manual proxy smoke test** (list versions + download artifact zip) before closing #274455.

## Residual risks

- No automated test exercises a real HTTP proxy end-to-end; unit tests mock `fetch` and only inspect dispatcher type.
- Behavioral differences vs. legacy `https-proxy-agent` Host/auth handling are unvalidated against customer proxy configurations.
- Unrelated ML snapshot drift (if not reverted) could mask UI regressions unrelated to the proxy fix.

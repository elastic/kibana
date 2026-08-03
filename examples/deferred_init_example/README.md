# Deferred Init Example

A **disposable demo plugin** that exercises core's deferred (lazy) Elasticsearch initialization
end-to-end. It is not meant to ship — it exists to show the developer experience (how a plugin
opts in) and the user experience (what someone sees when they hit a not-yet-initialized resource).

## What it demonstrates

- **Boot pays nothing.** The plugin's Elasticsearch work does **not** run at startup. It runs lazily,
  the first time one of the plugin's routes is hit.
- **Automatic, plugin-wide gating.** While init is pending, every one of the plugin's HTTP routes
  returns `503 { status: 'initializing' }` + `Retry-After`. The plugin author writes no per-route
  gating code.
- **Observable state.** An always-available core endpoint and the plugin's `/status` entry reflect
  `idle → initializing → available | failed`.
- **Clean UX, zero plugin code.** Core automatically wraps this app's `mount()` behind
  `<AppInitializingGate>`: a full-page "Initializing…" interface that resolves to the real content
  (or an error + retry on failure). `public/app.tsx` contains no polling, triggering, or gating
  code at all — see `core.deferredInit` (`@kbn/core-deferred-init-browser`) if you need to build
  custom UI against the same status observable instead of relying on the automatic gate.

## The opt-in (developer experience)

The entire opt-in is **one flag + one method**: `enableLazyInitialize: true` in the plugin's
`kibana.jsonc` manifest, and a `lazyInitialize` method on the server plugin class
(`server/plugin.ts`):

```ts
public async lazyInitialize(ctx: LazyInitContext): Promise<void> {
  // real, deferred ES work: ctx.elasticsearch.client, ctx.savedObjects, ctx.logger
}
```

Routes are registered normally (`core.http.createRouter()`); core wraps them automatically. The
browser app is registered normally too (`core.application.register()`); core wraps its `mount()`
automatically as well, driven by the same manifest flag.

> The deferred work here is a **stand-in** for "migrations + ES init", run in four phases: (1) a
> fake ~3s "saved object migrations" delay, (2) a configurable "default state" delay
> (`initDelayMs`), (3) loading `deferredInitExampleDependency`'s start contract (see below), (4) a
> small, real, direct ES write (create index + mapping, write one doc, including the greeting
> from step 3). It does **not** touch core saved-object migrations. The app lists these phases
> once init completes.

## Calling another plugin's start contract from inside `lazyInitialize`

`LazyInitContext` (the `ctx` passed to `lazyInitialize`) only carries
`{ elasticsearch, savedObjects, logger }` — no `core`/`plugins` field, by design (core stays
generic; it doesn't hand a lazy plugin's deferred work arbitrary access to every other plugin).
When `lazyInitialize` genuinely needs another plugin's start contract — here, a normal (non-lazy)
dependency, `deferredInitExampleDependency` — the pattern is:

1. Capture `core: CoreStart` on `this` during `start()`, since that's the only lifecycle method
   that receives it.
2. Declare the target as a dependency in `kibana.jsonc` (`requiredPlugins`/`optionalPlugins`), same
   requirement as any other `loadPluginContract` call.
3. Call `this.core.plugins.loadPluginContract<T>('pluginId')` from inside `lazyInitialize` itself.

```ts
private core?: CoreStart;

public start(core: CoreStart): DeferredInitExampleStartContract {
  this.core = core;
  // ...
}

public async lazyInitialize(ctx: LazyInitContext): Promise<void> {
  // ...
  const dependency = await this.core!.plugins.loadPluginContract<DeferredInitExampleDependencyStartContract>(
    'deferredInitExampleDependency'
  );
  const greeting = dependency.getGreeting();
  // ...
}
```

This is safe — no deadlock — specifically *because* it's called from `lazyInitialize`, not from
`start()` itself: core only resolves queued `loadPluginContract` requests once every plugin's
`start()` has returned, so calling it synchronously inside your own `start()` would hang (and
eventually time out). `lazyInitialize` always runs strictly after boot, so this ordering concern
doesn't apply to it. See `deferred_init_example_dependency`'s README for the companion side of this
demo, and `docs/specs/2026-07-13-fleet-lazy-init-licensing-contract.md` for the real-world case
this generalizes (Fleet needs `licensing`'s start contract inside its own future
`lazyInitialize`).

## Prerequisites

- A Kibana dev server connected to Elasticsearch. This is a private platform plugin, so it
  auto-loads in dev (no `--run-examples` needed).
- If you just added this plugin to a tree that was already bootstrapped, run `yarn kbn bootstrap`
  once so the new package is registered, then start the dev server.

## Configuration

Config namespace is `deferred_init_example` (set in `kibana.yml` / `kibana.dev.yml`):

| Key | Default | Meaning |
| --- | --- | --- |
| `deferred_init_example.initDelayMs` | `5000` | "Default state" phase delay (ms). Total init is this plus a fixed ~3s migrations phase, so `initializing` is comfortably observable. |
| `deferred_init_example.forceFailure` | `false` | When `true`, `lazyInitialize` throws after the migrations phase (exercises the failure/retry path). |

## Endpoints

| Endpoint | Gated? | Purpose |
| --- | --- | --- |
| `GET /api/deferred_init_example/doc` | Yes (by core) | Returns the doc written by `lazyInitialize`. First hit returns `503` and **triggers** the deferred init. |
| `GET /internal/core/deferred_init/deferredInitExample` | No (core route) | Returns `{ pluginId, status }`. Core's `deferredInit` browser service polls this on the app's behalf; reading it never triggers the work. |
| `GET /api/status` | No | Overall status; the `plugin:deferredInitExample` entry reflects the deferred-init state. |

(Add the base path if your dev server uses one, e.g. `…/ora/api/status`.)

## Runbook: reproduce the full flow

1. **Boot pays nothing.** Start the dev server. In the logs, confirm the readiness line
   `http server running` appears **without** the line
   `[deferredInitExample] lazyInitialize: running deferred Elasticsearch initialization`.
   Confirm the state endpoint reports `idle` before any request:
   ```
   curl -s '<base>/internal/core/deferred_init/deferredInitExample'
   # {"pluginId":"deferredInitExample","status":"idle"}
   ```

2. **Lazy on first request.** Hit the data route — the first call returns `503` and triggers init:
   ```
   curl -i '<base>/api/deferred_init_example/doc'
   # HTTP/1.1 503 ... retry-after: 1   body: {"status":"initializing"}
   ```
   The `lazyInitialize` log line now appears. The state endpoint transitions
   `idle → initializing → available` over ~3s (migrations) + `initDelayMs` (default state). After it
   is `available`, the same route returns `200` with the written doc:
   ```
   curl -s '<base>/api/deferred_init_example/doc'
   # {"message":"Initialized by deferred lazyInitialize","initializedAt":"..."}
   ```

3. **In the browser (UX).** Open **Deferred Init Example** (app id `deferredInitExample`, at
   `<base>/app/deferredInitExample`). On a fresh server you see the full-page "Initializing…"
   interface — rendered by core, before the plugin's own `mount()` ever runs — that resolves to
   the written document once init completes. The app's static bundle loads while gated because it
   is served by core, not by the plugin's API routes.

4. **Watch `/status`.** While initializing, `GET /api/status` shows `plugin:deferredInitExample` as
   `unavailable` with summary "deferredInitExample is initializing"; once done it is `available`.

5. **Failure path.** Set `deferred_init_example.forceFailure: true`, restart the dev server, open the
   app (or hit the data route). After the delay the gate shows its error panel with a **Retry**
   button, the state endpoint reports `failed`, and `/status` shows `unavailable`
   ("deferred initialization failed"). Clicking **Retry** re-triggers the run.

## Triggering paths

- **Request-triggered (headline path):** any hit to a gated route triggers the deferred work via
  core's `ensureInitialized`. This is what the UI relies on.
- **In-process, cross-plugin:** `start()` returns a real contract, `{ getDoc }` (see
  `DeferredInitExampleStartContract` in `server/plugin.ts`). Another plugin loads it via
  `core.plugins.loadPluginContract<DeferredInitExampleStartContract>('deferredInitExample')`,
  which waits for this plugin's deferred init (kicking it off if nobody has yet) before handing
  back the contract, and throws `DeferredInitializationError` if the deferred init ultimately
  fails. See the companion `deferred_init_example_consumer` plugin for a full runbook of this path
  — it calls `getDoc()` without ever touching this plugin's own routes.
- **Programmatic:** core's deferred-init engine also exposes `trigger(pluginId)` internally; a
  production control plane would call it. There's no separate public programmatic trigger for
  that — `loadPluginContract` (above) is the supported way for another plugin to drive/await it.

## Resetting

Each dev-server restart resets the in-process deferred-init state back to `idle`, so you can re-run
the flow from the top after every restart.

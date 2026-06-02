# @kbn/scout-synthtrace

Optional Playwright fixtures and helpers that depend on `@kbn/apm-synthtrace` and `@kbn/apm-synthtrace-client`.  
`@kbn/scout` stays free of those dependencies so selective Scout runs and module graphs stay smaller.

**Full wiring guide (platform, Oblt, global setup, typing):** see [Scout README — Optional: wiring Synthtrace](../kbn-scout/README.md#optional-wiring-synthtrace).

`@kbn/scout-oblt`, `@kbn/scout-search`, and `@kbn/scout-security` do **not** depend on or re-export this package.

## When to use

- Specs that need worker fixtures `apmSynthtraceEsClient` or `infraSynthtraceEsClient`.
- Parallel `global.setup.ts` callbacks that need those fixtures in scope.
- One-off client access via `getApmSynthtraceEsClient` / `getInfraSynthtraceEsClient` (e.g. Discover-style trace ingestion in setup only).

Add `@kbn/scout-synthtrace` to your module's `tsconfig.json` `kbn_references` (and regenerate Moon if you use it).

## Exports

| Export                          | Use                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `synthtraceFixture`             | `mergeTests(scoutTest, synthtraceFixture)` (or with Oblt `test` / `spaceTest`).                      |
| `getApmSynthtraceEsClient`      | Imperative APM client creation in setup scripts; pass `esClient`, `target`, `log`.                   |
| `getInfraSynthtraceEsClient`    | Imperative Infra client creation in setup scripts; pass `esClient`, `kbnUrl`, `auth`, `log`.         |
| `globalSetupHookWithSynthtrace` | Same worker stack as `@kbn/scout` `globalSetupHook` **plus** synthtrace (for parallel global setup). |
| `SynthtraceFixture`             | Type for `ScoutWorkerFixtures & SynthtraceFixture` when you `.extend` merged tests.                  |

## Quick examples

**Merge into UI `test` (platform):**

```ts
import { mergeTests, test as scoutTest } from '@kbn/scout';
import { synthtraceFixture } from '@kbn/scout-synthtrace';

export const test = mergeTests(scoutTest, synthtraceFixture).extend(/* … */);
```

**Global setup only:**

```ts
import { globalSetupHookWithSynthtrace } from '@kbn/scout-synthtrace';

globalSetupHookWithSynthtrace('Setup', async ({ apmSynthtraceEsClient, log }) => {
  await apmSynthtraceEsClient.clean();
});
```

**Merge with an existing global hook (e.g. Oblt):**

```ts
import { mergeTests, globalSetupHook as obltGlobalSetupHook } from '@kbn/scout-oblt';
import { synthtraceFixture } from '@kbn/scout-synthtrace';

const globalSetupHook = mergeTests(obltGlobalSetupHook, synthtraceFixture);
```

## Types

`SynthtraceFixture` describes the worker fixture keys (`apmSynthtraceEsClient`, `infraSynthtraceEsClient`). Use it when typing helpers or `extend<..., ScoutWorkerFixtures & SynthtraceFixture>`.

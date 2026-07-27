/**
 * ComputeSDK-backed adapter (https://computesdk.com) — one adapter for every
 * provider ComputeSDK supports (e2b, Daytona, Modal, Vercel, …), mirroring the
 * provider plumbing of computesdk/benchmarks.
 *
 * Setup (run from sandbox_bench/, package.json not required but recommended):
 *   npm i computesdk @computesdk/e2b        # or @computesdk/daytona, @computesdk/modal, …
 *   export E2B_API_KEY=...                  # provider-specific credentials
 *
 * Config (bench.config.example.json → providers.computesdk):
 *   {
 *     "provider": "e2b",                    // package suffix: @computesdk/<provider>
 *     "providerOptions": {},                // passed to the provider factory (apiKey usually via env)
 *     "createOptions": {}                   // passed to compute.sandbox.create (e.g. template/image)
 *   }
 *
 * Caveat: ComputeSDK's portable create() API has no cpu/mem knobs — sandbox
 * sizing is configured per provider (e.g. an e2b template built with 8 vCPU /
 * 16 GB). The runner's spec is recorded into results for bookkeeping, but it
 * is YOUR job to point `createOptions` at a template matching the level's
 * spec tier, or the L2+ numbers will be meaningless.
 */

let compute;
let settings;

export const capabilities = { snapshot: false }; // no portable snapshot API yet

export async function init(providerConfig) {
  settings = { provider: 'e2b', providerOptions: {}, createOptions: {}, ...providerConfig };
  let sdk;
  let providerPkg;
  try {
    sdk = await import('computesdk');
    providerPkg = await import(`@computesdk/${settings.provider}`);
  } catch (err) {
    throw new Error(
      `Missing dependencies for the computesdk adapter (${err.message}). ` +
        `Run: npm i computesdk @computesdk/${settings.provider}`
    );
  }
  const factory = providerPkg[settings.provider] ?? providerPkg.default;
  if (typeof factory !== 'function') {
    throw new Error(`@computesdk/${settings.provider} does not export a "${settings.provider}" factory`);
  }
  ({ compute } = sdk);
  compute.setConfig({ provider: factory(settings.providerOptions) });
}

export async function create(spec) {
  const sandbox = await compute.sandbox.create({
    // Sandbox lifetime; generous so it never undercuts the level ceiling.
    timeout: 3 * 60 * 60 * 1000,
    metadata: { bench: 'kbn-sandbox-bench', requestedSpec: JSON.stringify(spec ?? {}) },
    ...settings.createOptions,
  });
  return { sandbox };
}

export async function exec(handle, script, { timeoutMs }) {
  // Ship the payload as a file: multi-KB scripts as argv are fragile.
  const path = `/tmp/kbn_bench_task_${Date.now()}.sh`;
  await handle.sandbox.filesystem.writeFile(path, script);

  let timer;
  const timedOut = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ exitCode: 124, stdout: '', stderr: `host-side timeout after ${timeoutMs}ms` }), timeoutMs);
  });
  try {
    const result = await Promise.race([handle.sandbox.runCommand(`bash ${path}`), timedOut]);
    return {
      exitCode: result.exitCode ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function destroy(handle) {
  await handle.sandbox.destroy();
}

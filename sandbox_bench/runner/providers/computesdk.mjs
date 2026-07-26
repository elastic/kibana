/**
 * Template adapter for any provider reachable through ComputeSDK
 * (https://computesdk.com — e2b, Daytona, Modal, Vercel Sandbox, …), so this
 * harness can share provider plumbing with computesdk/benchmarks.
 *
 * Not wired up by default: install `computesdk` plus the provider package and
 * fill in the TODOs against the SDK version you pin. Kept as a stub rather
 * than guessed API calls.
 */

let compute;
let settings;

export const capabilities = { snapshot: false }; // flip per provider once wired up

export async function init(providerConfig) {
  settings = providerConfig ?? {};
  try {
    ({ compute } = await import('computesdk'));
  } catch {
    throw new Error(
      'computesdk is not installed. Run `npm i computesdk <provider-package>` next to the runner, ' +
        'or use the docker/local adapters.'
    );
  }
}

export async function create(spec) {
  // TODO: map spec {cpus, memGb, diskGb} onto the provider's sandbox options
  // and create the sandbox, e.g.:
  //   const sandbox = await compute.sandbox.create({ provider: settings.provider, ...resources });
  //   return { sandbox };
  throw new Error(`computesdk adapter not implemented yet (settings: ${JSON.stringify(settings)}, spec: ${JSON.stringify(spec)})`);
}

export async function exec(handle, script, { timeoutMs }) {
  // TODO: e.g. `const res = await handle.sandbox.runCommand('bash', ['-c', script], { timeoutMs })`
  // and return { exitCode, stdout, stderr }.
  throw new Error('computesdk adapter not implemented yet');
}

export async function destroy(handle) {
  // TODO: e.g. `await handle.sandbox.destroy()`
}

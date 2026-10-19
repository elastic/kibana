/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * RESEARCH ONLY (Track 2 islands) — main-side "type-derived" adapters.
 *
 * Main never waits on the island, so any contract member that main calls synchronously needs
 * a shape known in advance. In a product these entries would be generated from the TS
 * contract types (Track 2 S2 census categories); here they are transcribed by hand and every
 * entry is counted as an adoption cost.
 *
 *  SYNC_STUB  — sync function returning an object of async members: return a local object
 *               immediately, resolve the remote object lazily (TaskDefinition.createTaskRunner).
 *  REPLICA    — sync data members of a start contract: snapshot once at start (the registries
 *               are frozen after start), answer locally. Post-start registration is invisible.
 */

type AnyFn = (...args: unknown[]) => unknown;

export const stubUsage: Record<string, number> = {};
const used = (key: string) => {
  stubUsage[key] = (stubUsage[key] ?? 0) + 1;
};

const CREATE_TASK_RUNNER = /\.registerTaskDefinitions\(arg0\)\.[^.]+\.createTaskRunner$/;

export const wrapImportedFnWithStubs = (fn: AnyFn, label: string): unknown => {
  if (CREATE_TASK_RUNNER.test(label)) {
    used('SYNC_STUB:createTaskRunner');
    return (...args: unknown[]) => {
      let runner: Promise<Record<string, AnyFn | undefined>> | undefined;
      const remote = () => (runner ??= fn(...args) as Promise<Record<string, AnyFn | undefined>>);
      return {
        run: async () => {
          const r = await remote();
          return r.run!();
        },
        cancel: async () => {
          const r = await remote();
          return r.cancel?.();
        },
        cleanup: async () => {
          const r = await remote();
          return r.cleanup?.();
        },
      };
    };
  }
  return fn;
};

interface DefinitionModule {
  /** module specifier relative to the plugin's server dir */
  specifier: string;
  /** exported `register*(registry)` function that registers island-owned definitions */
  register: string;
  /** snapshot member whose island-owned entries are replaced by the main-side copies */
  member: string;
}

interface ReplicaSpec {
  /** async member awaited before snapshotting (async loaders) */
  ready?: string;
  snapshot: string[];
  /**
   * Island-owned definitions carry code main must run synchronously (Zod schemas used by
   * main-side validation). They are re-instantiated on main from the same static modules
   * ("registries by module specifier"); main-owned definitions come back by reference.
   */
  modules: DefinitionModule[];
  derived: Record<string, (snap: Record<string, unknown>, ...args: unknown[]) => unknown>;
}

const REPLICAS: Record<string, ReplicaSpec> = {
  workflowsExtensions: {
    ready: 'isReady',
    snapshot: ['getAllStepDefinitions', 'getAllTriggerDefinitions', 'getManagedWorkflowPluginIds'],
    modules: [
      { specifier: 'steps', register: 'registerInternalStepDefinitions', member: 'getAllStepDefinitions' },
      {
        specifier: 'triggers',
        register: 'registerInternalTriggerDefinitions',
        member: 'getAllTriggerDefinitions',
      },
    ],
    derived: {
      getStepDefinition: (snap, id) =>
        (snap.getAllStepDefinitions as Array<{ id: string }>).find((d) => d.id === id),
      hasStepDefinition: (snap, id) =>
        (snap.getAllStepDefinitions as Array<{ id: string }>).some((d) => d.id === id),
      getTriggerDefinition: (snap, id) =>
        (snap.getAllTriggerDefinitions as Array<{ id: string }>).find((d) => d.id === id),
    },
  },
};

/** Loads island-owned definitions on main from their static modules. */
const loadLocalDefinitions = async (
  serverPath: string,
  mod: DefinitionModule
): Promise<Map<string, unknown>> => {
  const local = new Map<string, unknown>();
  const loaded = (await import(`${serverPath}/${mod.specifier}`)) as Record<
    string,
    (registry: { register(def: unknown): void }) => void
  >;
  const pendingLoaders: Array<Promise<void>> = [];
  const collect = (def: unknown) => {
    if (typeof def === 'function') {
      pendingLoaders.push(
        Promise.resolve((def as () => Promise<unknown>)()).then((d) => {
          if (d) local.set((d as { id: string }).id, d);
        })
      );
      return;
    }
    local.set((def as { id: string }).id, def);
  };
  loaded[mod.register]({ register: collect });
  await Promise.all(pendingLoaders);
  return local;
};

export const applyMainStubs = async (
  plugin: string,
  serverPath: string,
  contract: unknown,
  snapshot: (members: string[]) => Promise<unknown>,
  isRemote: (value: unknown) => boolean
): Promise<unknown> => {
  const spec = REPLICAS[plugin];
  if (!spec || !contract || typeof contract !== 'object') return contract;
  const replicated = contract as Record<string, unknown>;
  const locals = await Promise.all(spec.modules.map((mod) => loadLocalDefinitions(serverPath, mod)));
  let snap: Record<string, unknown> = {};
  const refresh = async () => {
    const next = (await snapshot(spec.snapshot)) as Record<string, unknown>;
    spec.modules.forEach((mod, i) => {
      const items = (next[mod.member] as Array<{ id: string }>) ?? [];
      next[mod.member] = items.map((item) => {
        if (!isRemote(item)) return item; // main-owned: original object by reference
        const copy = locals[i].get(item.id);
        if (copy) {
          used(`MODULE_REPLICA:${plugin}.${mod.member}`);
          return copy;
        }
        used(`UNREPLICATED:${plugin}.${mod.member}:${item.id}`);
        return item;
      });
    });
    snap = next;
  };
  // Same visibility as the in-process registry: what is registered so far, refreshed once the
  // async loaders settle (awaiting readiness inside start can deadlock the start lifecycle).
  await refresh();
  if (spec.ready) {
    void (replicated[spec.ready] as () => Promise<unknown>)().then(refresh, () => undefined);
  }
  for (const member of spec.snapshot) {
    used(`REPLICA:${plugin}.${member}`);
    replicated[member] = () => snap[member];
  }
  for (const [member, derive] of Object.entries(spec.derived)) {
    used(`REPLICA:${plugin}.${member}`);
    replicated[member] = (...args: unknown[]) => derive(snap, ...args);
  }
  return contract;
};

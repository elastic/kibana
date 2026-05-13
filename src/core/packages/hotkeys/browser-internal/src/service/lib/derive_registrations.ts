/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subscription, type Observable } from 'rxjs';
import type { HotkeyManager } from '@tanstack/hotkeys';
import type { HotkeyDefinition } from '@kbn/core-hotkeys-browser';
import type { HotkeyOverride } from './overrides_source';

/**
 * Projects a live `HotkeyManager.registrations` store into the
 * {@link HotkeyDefinition} shape consumed by discovery UIs. Only
 * registrations that carry Kibana metadata (via `meta.kibana`) are included;
 * any registrations made directly against the manager by third-party code
 * are ignored so the stream is constrained to Kibana-owned hotkeys.
 *
 * @internal
 */
const projectRegistrations = (manager: HotkeyManager): ReadonlyArray<HotkeyDefinition> => {
  const out: HotkeyDefinition[] = [];
  for (const reg of manager.registrations.state.values()) {
    const kibana = reg.options.meta?.kibana;
    if (!kibana) {
      continue;
    }
    out.push({
      id: kibana.id,
      keys: reg.hotkey,
      defaultKeys: kibana.defaultKeys,
      label: kibana.label,
      description: kibana.description,
      scope: kibana.scope,
      appId: kibana.appId,
      featureId: kibana.featureId,
      group: kibana.group,
      enabled: reg.options.enabled !== false,
    });
  }
  return out;
};

const projectDiscoveryRows = (
  rows: ReadonlyArray<HotkeyDefinition>,
  overrides: ReadonlyMap<string, HotkeyOverride>
): HotkeyDefinition[] =>
  rows.map((def) => {
    const override = overrides.get(def.id);
    return {
      ...def,
      keys: override?.keys ?? def.keys,
      enabled: override?.enabled ?? def.enabled !== false,
    };
  });

/**
 * Merges TanStack-backed registrations with discovery-only rows. When ids collide,
 * TanStack-backed rows win (callers must avoid duplicate ids across paths).
 *
 * @internal
 */
export const mergeHotkeyProjections = (
  managerDefs: ReadonlyArray<HotkeyDefinition>,
  discoveryDefs: ReadonlyArray<HotkeyDefinition>
): HotkeyDefinition[] => {
  const byId = new Map<string, HotkeyDefinition>();
  for (const def of discoveryDefs) {
    byId.set(def.id, def);
  }
  for (const def of managerDefs) {
    byId.set(def.id, def);
  }
  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
};

/**
 * Cheap content signature used to suppress `registrations` emissions that
 * don't meaningfully change the projected view. `HotkeyManager.registrations`
 * also mutates on every keypress (to update `hasFired` / `triggerCount`),
 * which would otherwise cause downstream subscribers to re-render on every
 * shortcut invocation.
 */
const signature = (regs: ReadonlyArray<HotkeyDefinition>): string =>
  regs
    .map(
      (r) =>
        `${r.id}\u241F${JSON.stringify(r.keys)}\u241F${JSON.stringify(r.defaultKeys)}\u241F${
          r.scope
        }\u241F${r.appId ?? ''}\u241F${r.featureId ?? ''}\u241F${r.label}\u241F${
          r.description ?? ''
        }\u241F${r.group ?? ''}\u241F${r.enabled === false ? '0' : '1'}`
    )
    .join('\u241E');

/** @internal */
export interface DerivedRegistrations {
  readonly registrations$: Observable<ReadonlyArray<HotkeyDefinition>>;
  dispose(): void;
}

/** @internal */
export interface MergedDerivedRegistrationsDeps {
  readonly manager: HotkeyManager;
  readonly getDiscoveryRows: () => ReadonlyArray<HotkeyDefinition>;
  readonly discoveryUpdates$: Observable<void>;
  readonly getOverrides: () => ReadonlyMap<string, HotkeyOverride>;
}

/**
 * Wraps TanStack `HotkeyManager.registrations` together with optional discovery-only rows into a
 * single Kibana-flavored RxJS observable. Emits the merged projection on subscribe, re-emits on
 * every meaningful state change, and completes when {@link DerivedRegistrations.dispose} is called.
 *
 * @internal
 */
export const createDerivedRegistrations = ({
  manager,
  getDiscoveryRows,
  discoveryUpdates$,
  getOverrides,
}: MergedDerivedRegistrationsDeps): DerivedRegistrations => {
  const projectMerged = (): ReadonlyArray<HotkeyDefinition> => {
    const fromManager = projectRegistrations(manager);
    const discoveryProjected = projectDiscoveryRows(getDiscoveryRows(), getOverrides());
    return mergeHotkeyProjections(fromManager, discoveryProjected);
  };

  let lastProjection = projectMerged();
  let lastSignature = signature(lastProjection);
  const subject = new BehaviorSubject<ReadonlyArray<HotkeyDefinition>>(lastProjection);

  const emitIfChanged = () => {
    const nextProjection = projectMerged();
    const nextSignature = signature(nextProjection);
    if (nextSignature === lastSignature) {
      return;
    }
    lastProjection = nextProjection;
    lastSignature = nextSignature;
    subject.next(nextProjection);
  };

  const subscription = new Subscription();
  subscription.add(manager.registrations.subscribe(() => emitIfChanged()));
  subscription.add(discoveryUpdates$.subscribe(() => emitIfChanged()));

  return {
    registrations$: subject.asObservable(),
    dispose: () => {
      subscription.unsubscribe();
      subject.complete();
    },
  };
};

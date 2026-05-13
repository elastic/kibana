/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/consistent-type-imports -- Monaco editor typings share the `monaco` namespace export */

import type { HotkeyDefinition, HotkeysStart } from '@kbn/core-hotkeys-browser';
import { monaco } from '@kbn/monaco';
import type { MonacoHotkeyDiscoveryMeta } from '../types';
import { mapMonacoKeybindingToHotkeyChord } from '../utils';

/**
 * Wraps `editor.addAction`, so when a descriptor includes optional {@link MonacoHotkeyDiscoveryMeta}
 * under `hotkeysDiscovery`, each entry in `keybindings` registers a cheat-sheet row via
 * {@link HotkeysStart.registerForDiscovery} while Monaco continues to handle the shortcut.
 *
 * The returned {@link monaco.IDisposable} unregisters discovery rows then disposes the Monaco action.
 */
export const installDiscoveryAwareAddAction = (
  editor: monaco.editor.IStandaloneCodeEditor,
  hotkeys?: Pick<HotkeysStart, 'registerForDiscovery'>
) => {
  const original = editor.addAction.bind(editor);
  let disposed = false;

  if (!hotkeys) {
    return () => {};
  }

  editor.addAction = ((descriptor: monaco.editor.IActionDescriptor): monaco.IDisposable => {
    const { hotkeysDiscovery, ...monacoDescriptor } =
      descriptor as monaco.editor.IActionDescriptor & {
        hotkeysDiscovery?: MonacoHotkeyDiscoveryMeta;
      };

    const inner = original(monacoDescriptor);

    const discoveryHandles: Array<{ unregister: () => void }> = [];

    const bindings = descriptor.keybindings;
    if (hotkeysDiscovery && bindings?.length) {
      bindings.forEach((binding, index) => {
        const discoveryId =
          bindings.length === 1 ? hotkeysDiscovery.id : `${hotkeysDiscovery.id}:binding${index}`;

        try {
          const chord = mapMonacoKeybindingToHotkeyChord(binding);
          const def: HotkeyDefinition = {
            id: discoveryId,
            keys: chord,
            label: hotkeysDiscovery.label,
            description: hotkeysDiscovery.description,
            scope: hotkeysDiscovery.scope ?? 'context',
            appId: hotkeysDiscovery.appId,
            featureId: hotkeysDiscovery.featureId,
            group: hotkeysDiscovery.group,
            enabled: hotkeysDiscovery.enabled,
          };
          discoveryHandles.push(hotkeys.registerForDiscovery(def));
        } catch {
          // If discovery registration fails, still register the Monaco action (best-effort discovery).
        }
      });
    }

    return {
      dispose: () => {
        discoveryHandles.splice(0).forEach((h) => h.unregister());
        inner.dispose();
      },
    };
  }) as typeof editor.addAction;

  return () => {
    if (disposed) {
      return;
    }
    disposed = true;
    editor.addAction = original as typeof editor.addAction;
  };
};

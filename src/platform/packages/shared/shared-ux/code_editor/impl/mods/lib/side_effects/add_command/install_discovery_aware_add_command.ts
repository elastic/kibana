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

const isDiscoveryMeta = (value: unknown): value is MonacoHotkeyDiscoveryMeta =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      'label' in value &&
      typeof (value as MonacoHotkeyDiscoveryMeta).id === 'string' &&
      typeof (value as MonacoHotkeyDiscoveryMeta).label === 'string'
  );

/**
 * Wraps `editor.addCommand`, so when provided with optional {@link MonacoHotkeyDiscoveryMeta} the
 * keybinding shows up in the hotkeys service's cheat-sheet rows, via
 * {@link HotkeysStart.registerForDiscovery} while Monaco continues to execute the shortcut.
 */
export const installDiscoveryAwareAddCommand = (
  editor: monaco.editor.IStandaloneCodeEditor,
  hotkeys?: Pick<HotkeysStart, 'registerForDiscovery'>
) => {
  const original = editor.addCommand.bind(editor);

  const discoveryHandles: Array<{ unregister: () => void }> = [];
  let disposed = false;

  if (!hotkeys) {
    return () => {};
  }

  editor.addCommand = ((
    keybinding: number,
    handler: monaco.editor.ICommandHandler,
    keyBindingMeta?: MonacoHotkeyDiscoveryMeta | string
  ): string | null => {
    let contextArg: string | undefined;

    if (isDiscoveryMeta(keyBindingMeta)) {
      const chord = mapMonacoKeybindingToHotkeyChord(keybinding);

      try {
        const def: HotkeyDefinition = {
          id: keyBindingMeta.id,
          keys: chord,
          label: keyBindingMeta.label,
          description: keyBindingMeta.description,
          scope: keyBindingMeta.scope ?? 'context',
          appId: keyBindingMeta.appId,
          featureId: keyBindingMeta.featureId,
          group: keyBindingMeta.group,
          enabled: keyBindingMeta.enabled,
        };

        discoveryHandles.push(hotkeys.registerForDiscovery(def));
      } catch {
        // If discovery registration fails, still register the Monaco command (best-effort discovery).
      }
    } else if (typeof keyBindingMeta === 'string') {
      contextArg = keyBindingMeta;
    }

    return original(keybinding, handler, contextArg);
  }) as typeof editor.addCommand;

  return () => {
    if (disposed) {
      return;
    }
    disposed = true;
    discoveryHandles.splice(0).forEach((h) => h.unregister());
    editor.addCommand = original as typeof editor.addCommand;
  };
};

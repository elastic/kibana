/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/consistent-type-imports -- Monaco editor typings share the `monaco` namespace export */

import type { HotkeysStart } from '@kbn/core-hotkeys-browser';
import { monaco } from '@kbn/monaco';
import type { MonacoHotkeyDiscoveryMeta } from '../types';
import { mapMonacoKeybindingToHotkeyChord, createHandleSet, defFromMeta } from '../utils';

const isDiscoveryMeta = (value: unknown): value is MonacoHotkeyDiscoveryMeta =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as MonacoHotkeyDiscoveryMeta).id === 'string' &&
  typeof (value as MonacoHotkeyDiscoveryMeta).label === 'string';

/**
 * Wraps `editor.addCommand`, so when provided with optional {@link MonacoHotkeyDiscoveryMeta} the
 * keybinding shows up in the hotkeys service's cheat-sheet rows, via
 * {@link HotkeysStart.registerForDiscovery} while Monaco continues to execute the shortcut.
 *
 */
export const monkeyPatchEditorAddCommandForHotkeysDiscovery = (
  editor: monaco.editor.IStandaloneCodeEditor,
  hotkeys?: Pick<HotkeysStart, 'registerForDiscovery'>
) => {
  const original = editor.addCommand.bind(editor);

  if (!hotkeys) {
    return () => {};
  }

  const handles = createHandleSet();
  let disposed = false;

  editor.addCommand = ((
    keybinding: number,
    handler: monaco.editor.ICommandHandler,
    keyBindingMeta?: MonacoHotkeyDiscoveryMeta | string
  ): string | null => {
    let contextArg: string | undefined;

    if (!isDiscoveryMeta(keyBindingMeta)) {
      return original(keybinding, handler, contextArg);
    }

    try {
      const { keys, ...meta } = keyBindingMeta;

      const chord = mapMonacoKeybindingToHotkeyChord(keybinding);

      handles.add(
        hotkeys.registerForDiscovery(
          defFromMeta({
            ...meta,
            keys: chord,
          })
        )
      );
    } catch (err) {
      // Best-effort discovery: keep the Monaco command live but surface mistakes in dev.
      // eslint-disable-next-line no-console
      console.warn(`[code-editor] Failed to register discovery row "${keyBindingMeta.id}"`, err);
    }

    return original(keybinding, handler, contextArg);
  }) as typeof editor.addCommand;

  return () => {
    if (disposed) {
      return;
    }
    disposed = true;
    handles.drain();
    editor.addCommand = original as typeof editor.addCommand;
  };
};

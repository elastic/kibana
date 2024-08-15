/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KeyboardShortcutChrome } from './keyboard_shortcut_chrome';

type Core = Pick<CoreStart, 'chrome' | 'notifications' | 'theme' | 'i18n'>;

interface RegisterHelpChromeDeps {
  core: Core;
  appName: string;
  copyPaste?: CopyPasteHandlers;
}

function registerHelpChrome({ appName, copyPaste, core }: RegisterHelpChromeDeps) {
  const chromeHelper = {
    order: -Infinity,
    mount: toMountPoint(<KeyboardShortcutChrome appName={appName} copyPaste={copyPaste} />, core),
  };
  core.chrome.navControls.registerRight(chromeHelper);
  return () => core.chrome.navControls.unregisterRight(chromeHelper);
}

interface TimeRange {
  from: string;
  to: string;
}

/** @internal */
export type CopyPasteHandlers =
  | {
      topicId: 'global';
      onCopy: () => object | undefined;
      onPaste: (t: object) => void;
    }
  | {
      topicId: 'timerange';
      onCopy: () => TimeRange | undefined;
      onPaste: (t: TimeRange) => void;
    };

const GLOBAL_CLIPBOARD_DATA_PREFIX = 'KBN_COPY_PASTE';
function registerCopyPasteTimeRange({
  core,
  copyPaste,
}: {
  core: Core;
  copyPaste: CopyPasteHandlers;
}) {
  const clipboardDataPrefix = `${GLOBAL_CLIPBOARD_DATA_PREFIX}:${copyPaste.topicId ?? 'global'}:`;
  const onCopy = (eve: ClipboardEvent) => {
    // If the user is actually copying something, ignore it
    if (window.getSelection()?.toString() || !eve.clipboardData) return;
    const activeBounds = copyPaste.onCopy();
    if (!activeBounds) return;

    eve.preventDefault();
    eve.clipboardData.setData('text', `${clipboardDataPrefix}${JSON.stringify(activeBounds)}`);
    core.notifications.toasts.addSuccess({
      title: 'Copied time range to clipboard!',
    });
  };
  const onPaste = (eve: ClipboardEvent) => {
    if (!eve.clipboardData) return;
    const clipboardData = eve.clipboardData.getData('text');
    if (!clipboardData.startsWith(clipboardDataPrefix)) return;

    const bounds = JSON.parse(clipboardData.slice(clipboardDataPrefix.length));
    copyPaste.onPaste(bounds);
    core.notifications.toasts.addSuccess({
      title: 'Pasted time range!',
    });
  };
  document.addEventListener('copy', onCopy);
  document.addEventListener('paste', onPaste);
  return () => {
    document.removeEventListener('copy', onCopy);
    document.removeEventListener('paste', onPaste);
  };
}

interface RegisterArgs {
  appName: string;
  core: Core;
  /** Create listeners for setting timerange on copy */
  copyPaste?: CopyPasteHandlers;
}

export function registerGlobalKeyboardShortcuts({ copyPaste, appName, core }: RegisterArgs) {
  const unregisterHelpChrome = registerHelpChrome({ appName, copyPaste, core });
  const unregisterCopyPaste = copyPaste
    ? registerCopyPasteTimeRange({ core, copyPaste })
    : undefined;
  return () => {
    unregisterHelpChrome();
    unregisterCopyPaste?.();
  };
}

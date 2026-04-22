/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHotkeys } from './chrome_hooks';
import { HotkeysCheatSheetModal } from './hotkeys_cheat_sheet_modal';

const OPEN_CHEAT_SHEET_HOTKEY_ID = 'platform:chrome.openHotkeysCheatSheet';

/**
 * Header button that opens the keyboard shortcut cheat sheet and registers
 * `Shift+?` as the global shortcut to toggle it open.
 */
export const HeaderHotkeysMenu = React.memo(() => {
  const hotkeys = useHotkeys();
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handle = hotkeys.register(
      {
        id: OPEN_CHEAT_SHEET_HOTKEY_ID,
        keys: 'Shift+?',
        scope: 'global',
        group: i18n.translate('core.ui.chrome.hotkeysCheatSheet.groupHelp', {
          defaultMessage: 'Help',
        }),
        label: i18n.translate('core.ui.chrome.hotkeysCheatSheet.openShortcutLabel', {
          defaultMessage: 'Show keyboard shortcuts',
        }),
      },
      open
    );
    return handle.unregister;
  }, [hotkeys, open]);

  return (
    <>
      <EuiHeaderSectionItemButton
        aria-label={i18n.translate('core.ui.chrome.hotkeysCheatSheet.buttonAriaLabel', {
          defaultMessage: 'Keyboard shortcuts',
        })}
        data-test-subj="hotkeysCheatSheetButton"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <EuiIcon type="keyboard" size="m" aria-hidden={true} />
      </EuiHeaderSectionItemButton>
      {isOpen ? <HotkeysCheatSheetModal onClose={close} /> : null}
    </>
  );
});

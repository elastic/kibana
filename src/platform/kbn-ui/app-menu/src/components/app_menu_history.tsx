/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// have to copy `isMac` from `@kbn/shared-ux-utility` to get around allowlist
const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent ?? '');

import type { AppMenuConfig } from '../types';

interface AppMenuHistoryComponentProps {
  historyConfig: AppMenuConfig['historyConfig'];
}

const COMMAND_KEY = isMac ? '⌘' : 'CTRL';

export const AppMenuHistoryComponent = ({ historyConfig }: AppMenuHistoryComponentProps) => {
  return (
    <>
      {historyConfig?.undo && (
        <EuiToolTip
          content={
            <>
              {i18n.translate('kbnUI.appMenu.undoHistoryButton', {
                defaultMessage: 'Undo',
              })}{' '}
              (<kbd>{COMMAND_KEY}</kbd> <kbd>Z</kbd>)
            </>
          }
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            aria-label={i18n.translate('kbnUI.appMenu.undoHistoryButton', {
              defaultMessage: 'Undo',
            })}
            color="text"
            disabled={historyConfig.undo.disabled}
            iconType={'undo'}
            onClick={historyConfig.undo.onClick}
          />
        </EuiToolTip>
      )}
      {historyConfig?.redo && (
        <EuiToolTip
          content={
            <>
              {i18n.translate('kbnUI.appMenu.redoHistoryButton', {
                defaultMessage: 'Redo',
              })}{' '}
              (<kbd>{COMMAND_KEY}</kbd> <kbd>Y</kbd>)
            </>
          }
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            aria-label={i18n.translate('kbnUI.appMenu.redoHistoryButton', {
              defaultMessage: 'Redo',
            })}
            color="text"
            disabled={historyConfig.redo.disabled}
            iconType={'redo'}
            onClick={historyConfig.redo.onClick}
          />
        </EuiToolTip>
      )}
    </>
  );
};

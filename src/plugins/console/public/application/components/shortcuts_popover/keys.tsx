/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon } from '@elastic/eui';

export const KEYS = {
  keyCtrlCmd: i18n.translate('console.shortcutKeys.keyCtrlCmd', {
    defaultMessage: 'Ctrl/Cmd',
  }),
  keyEnter: i18n.translate('console.shortcutKeys.keyEnter', {
    defaultMessage: 'Enter',
  }),
  keyAltOption: i18n.translate('console.shortcutKeys.keyAltOption', {
    defaultMessage: 'Alt/Option',
  }),
  keyOption: i18n.translate('console.shortcutKeys.keyOption', {
    defaultMessage: 'Option',
  }),
  keyShift: i18n.translate('console.shortcutKeys.keyShift', {
    defaultMessage: 'Shift',
  }),
  keyTab: i18n.translate('console.shortcutKeys.keyTab', {
    defaultMessage: 'Tab',
  }),
  keyEsc: i18n.translate('console.shortcutKeys.keyEsc', {
    defaultMessage: 'Esc',
  }),
  keyUp: (
    <EuiIcon
      type={'sortUp'}
      title={i18n.translate('console.shortcutKeys.keyUpArrow', {
        defaultMessage: 'Up arrow',
      })}
      size="s"
    />
  ),
  keyDown: (
    <EuiIcon
      type={'sortDown'}
      title={i18n.translate('console.shortcutKeys.keyDownArrow', {
        defaultMessage: 'Down arrow',
      })}
      size="s"
    />
  ),
  keySlash: i18n.translate('console.shortcutKeys.keySlash', {
    defaultMessage: '/',
  }),
  keySpace: i18n.translate('console.shortcutKeys.keySpace', {
    defaultMessage: 'Space',
  }),
  keyI: i18n.translate('console.shortcutKeys.keyI', {
    defaultMessage: 'I',
  }),
  keyO: i18n.translate('console.shortcutKeys.keyO', {
    defaultMessage: 'O',
  }),
  keyL: i18n.translate('console.shortcutKeys.keyL', {
    defaultMessage: 'L',
  }),
};

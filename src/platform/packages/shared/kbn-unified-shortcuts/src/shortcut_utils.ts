/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';

const editableTargetSelector = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="textbox"]',
  '.ace_editor',
  '.monaco-editor',
].join(', ');

export const normalizeShortcutKey = (key: string) => key.toLowerCase();

export const hasModifierKey = (event: KeyboardEvent) => {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
};

export const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    (target instanceof HTMLElement && target.isContentEditable) ||
    Boolean(target.closest(editableTargetSelector))
  );
};

export const consumeKeyboardEvent = (event: KeyboardEvent) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

export const isPrimaryModifierOnly = (event: KeyboardEvent) => {
  return isMac
    ? event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey
    : event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
};

const getScreenReaderShortcutKeyLabel = (key: string) => {
  switch (key) {
    case 'ArrowLeft':
      return i18n.translate('unifiedShortcuts.shortcutUtils.screenReaderArrowLeftLabel', {
        defaultMessage: 'left arrow',
      });
    case 'ArrowRight':
      return i18n.translate('unifiedShortcuts.shortcutUtils.screenReaderArrowRightLabel', {
        defaultMessage: 'right arrow',
      });
    default:
      return key.toLowerCase();
  }
};

export const getScreenReaderShortcutDescription = ({
  key,
  description,
}: {
  key: string;
  description: string;
}) => {
  return i18n.translate('unifiedShortcuts.shortcutUtils.screenReaderShortcutDescription', {
    defaultMessage: '{key} for {description}',
    values: {
      key: getScreenReaderShortcutKeyLabel(key),
      description,
    },
  });
};

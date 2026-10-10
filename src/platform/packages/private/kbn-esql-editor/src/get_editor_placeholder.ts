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

/** Placeholder shown in an empty editor. */
export const getEditorPlaceholder = ({
  hasExternalVisor,
  isNlToEsqlEnabled,
}: {
  hasExternalVisor?: boolean;
  isNlToEsqlEnabled: boolean;
}): string => {
  // The visor next to the editor is the AI entry point, so only point at the missing source.
  if (hasExternalVisor) {
    return i18n.translate('esqlEditor.placeholder.withVisor', {
      defaultMessage: 'Start typing ES|QL, beginning with FROM to choose a source',
    });
  }
  if (isNlToEsqlEnabled) {
    return i18n.translate('esqlEditor.placeholder', {
      defaultMessage:
        "Start typing ES|QL, or describe what you're looking for in a // comment, then press {commandKey}+J to generate the query",
      values: { commandKey: isMac ? '⌘' : 'Ctrl' },
    });
  }
  return i18n.translate('esqlEditor.placeholder.basic', {
    defaultMessage: 'Start typing ES|QL',
  });
};

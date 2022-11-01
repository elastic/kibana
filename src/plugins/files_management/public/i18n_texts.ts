/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  entityName: i18n.translate('filesManagement.entityName.title', { defaultMessage: 'file' }),
  entityNamePlural: i18n.translate('filesManagement.entityNamePlural.title', {
    defaultMessage: 'files',
  }),
  emptyPromptTitle: i18n.translate('filesManagement.emptyPrompt.title', {
    defaultMessage: 'No files found',
  }),
  emptyPromptDescription: i18n.translate('filesManagement.emptyPrompt.title', {
    defaultMessage: 'Any files created in Kibana will be listed here.',
  }),
  size: i18n.translate('filesManagement.table.sizeColumnName', {
    defaultMessage: 'Size',
  }),
};

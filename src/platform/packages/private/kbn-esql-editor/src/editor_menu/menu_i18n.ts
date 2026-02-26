/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const helpLabel = i18n.translate('esqlEditor.menu.helpLabel', {
  defaultMessage: 'ES|QL help',
});

export const searchTooltipLabel = (commandKey: string) =>
  i18n.translate('esqlEditor.menu.searchTooltipLabel', {
    defaultMessage: 'Filter your data using KQL syntax ({commandKey}+K)',
    values: { commandKey },
  });

export const showHistoryLabel = i18n.translate('esqlEditor.query.showQueriesLabel', {
  defaultMessage: 'Show recent queries',
});

export const hideHistoryLabel = i18n.translate('esqlEditor.query.hideQueriesLabel', {
  defaultMessage: 'Hide recent queries',
});

export const addStarredQueryLabel = i18n.translate(
  'esqlEditor.query.querieshistory.addFavoriteTitle',
  {
    defaultMessage: 'Add ES|QL query to Starred',
  }
);

export const removeStarredQueryLabel = i18n.translate(
  'esqlEditor.query.querieshistory.removeFavoriteTitle',
  {
    defaultMessage: 'Remove ES|QL query from Starred',
  }
);

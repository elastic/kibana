/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const searchPlaceholder = i18n.translate('esqlEditor.visor.searchPlaceholder', {
  defaultMessage: 'Filter using KQL',
});

export const nlPlaceholder = i18n.translate('esqlEditor.visor.nlPlaceholder', {
  defaultMessage: 'Describe your query in natural language',
});

export const nlEmptyEditorPlaceholder = i18n.translate(
  'esqlEditor.visor.nlEmptyEditorPlaceholder',
  {
    defaultMessage: "Describe what you're looking for",
  }
);

export const generatingLabel = i18n.translate('esqlEditor.visor.generatingLabel', {
  defaultMessage: 'Generating...',
});

export const stopLabel = i18n.translate('esqlEditor.visor.stopLabel', {
  defaultMessage: 'Stop',
});

export const aiModeLabel = i18n.translate('esqlEditor.visor.aiModeLabel', {
  defaultMessage: 'Query with AI',
});

export const aiModeTooltip = i18n.translate('esqlEditor.visor.aiModeTooltip', {
  defaultMessage: 'Query using natural language',
});

export const kqlModeLabel = i18n.translate('esqlEditor.visor.kqlModeLabel', {
  defaultMessage: 'Filter using KQL',
});

export const kqlModeNoSourceTooltip = i18n.translate('esqlEditor.visor.kqlModeNoSourceTooltip', {
  defaultMessage: 'Add a source with FROM to filter using KQL',
});

export const visorModeLegend = i18n.translate('esqlEditor.visor.modeLegend', {
  defaultMessage: 'Switch between KQL and Query with AI',
});

export const enterHintFilterLabel = i18n.translate('esqlEditor.visor.enterHintFilter', {
  defaultMessage: 'Filter',
});

export const enterHintGenerateLabel = i18n.translate('esqlEditor.visor.enterHintGenerate', {
  defaultMessage: 'Generate query',
});

export const nlErrorMessage = i18n.translate('esqlEditor.visor.nlError', {
  defaultMessage: 'Failed to generate ES|QL query',
});

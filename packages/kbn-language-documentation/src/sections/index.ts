/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const getESQLDocsSections = async () => {
  const groups: Array<{
    label: string;
    description?: string;
    items: Array<{ label: string; description?: JSX.Element }>;
  }> = [];
  const {
    sourceCommands,
    processingCommands,
    initialSection,
    scalarFunctions,
    aggregationFunctions,
    groupingFunctions,
    operators,
  } = await import('./esql_documentation_sections');
  groups.push({
    label: i18n.translate('languageDocumentation.esqlSections.initialSectionLabel', {
      defaultMessage: 'ES|QL',
    }),
    items: [],
  });
  groups.push(
    sourceCommands,
    processingCommands,
    scalarFunctions,
    aggregationFunctions,
    groupingFunctions,
    operators
  );
  return {
    groups,
    initialSection,
  };
};

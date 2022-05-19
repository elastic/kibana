/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const typeFieldName = i18n.translate(
  'indexPatternManagement.objectsTable.relationships.columnTypeName',
  {
    defaultMessage: 'Type',
  }
);

export const typeFieldDescription = i18n.translate(
  'indexPatternManagement.objectsTable.relationships.columnTypeDescription',
  { defaultMessage: 'Type of the saved object' }
);

export const titleFieldName = i18n.translate(
  'indexPatternManagement.objectsTable.relationships.columnTitleName',
  {
    defaultMessage: 'Title',
  }
);

export const titleFieldDescription = i18n.translate(
  'indexPatternManagement.objectsTable.relationships.columnTitleDescription',
  { defaultMessage: 'Title of the saved object' }
);

export const filterTitle = i18n.translate(
  'indexPatternManagement.objectsTable.relationships.search.filters.type.name',
  { defaultMessage: 'Type' }
);

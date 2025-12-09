/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export interface FieldInfo {
  value: unknown;
  field: string;
}

export interface BuildSectionDescriptionParams {
  serviceName?: FieldInfo;
  culprit?: FieldInfo;
  message?: FieldInfo;
  type?: FieldInfo;
  groupingName?: FieldInfo;
}

export function buildSectionDescription({
  serviceName,
  culprit,
  message,
  type,
  groupingName,
}: BuildSectionDescriptionParams): string | undefined {
  const fields: (FieldInfo | undefined)[] = [serviceName, culprit, message, type, groupingName];
  const fieldsWithValues = fields.filter((field) => field?.value).map((field) => field?.field);

  if (fieldsWithValues.length === 0) {
    return undefined;
  }

  return i18n.translate(
    'unifiedDocViewer.docViewerLogsOverview.subComponents.similarErrors.description',
    {
      defaultMessage: 'These errors are based on the following fields: {fields}.',
      values: {
        fields: fieldsWithValues.join(', '),
      },
    }
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseFieldsMetadataHook } from '@kbn/fields-metadata-plugin/public/hooks/use_fields_metadata';
import * as i18n from '../translations';

/**
 * Helper function to return the description of an allowed value of the specified field
 * @param fieldName
 * @param value
 * @returns ecs description of the value
 */
export const getEcsAllowedValueDescription = (
  fieldsMetadata: ReturnType<UseFieldsMetadataHook>['fieldsMetadata'] = {},
  value: string
): string => {
  const allowedValues = fieldsMetadata['event.category']?.allowed_values ?? [];
  const result =
    allowedValues?.find((item) => item.name === value)?.description ?? i18n.noEcsDescriptionReason;
  return result;
};

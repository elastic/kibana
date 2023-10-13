/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Query } from '@elastic/eui';
import { getFieldDefinitions } from '@kbn/management-settings-field-definition';
import { FieldDefinition } from '@kbn/management-settings-types';
import { useServices } from '../services';
import { useSettings } from './use_settings';

/**
 * React hook which retrieves settings and returns an observed collection of
 * {@link FieldDefinition} objects derived from those settings.
 * @param query The {@link Query} to execute for filtering the fields.
 * @returns An array of {@link FieldDefinition} objects.
 */
export const useFields = (query?: Query): FieldDefinition[] => {
  const { isCustomSetting: isCustom, isOverriddenSetting: isOverridden } = useServices();
  const settings = useSettings();
  const fields = getFieldDefinitions(settings, { isCustom, isOverridden });
  if (query) {
    return Query.execute(query, fields);
  }
  return fields;
};

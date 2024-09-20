/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Ast, Query } from '@elastic/eui';
import { getFieldDefinitions } from '@kbn/management-settings-field-definition';
import { FieldDefinition } from '@kbn/management-settings-types';
import { UiSettingsScope } from '@kbn/core-ui-settings-common';
import { useServices } from '../services';
import { useSettings } from './use_settings';

/**
 * React hook which retrieves settings and returns an observed collection of
 * {@link FieldDefinition} objects derived from those settings.
 * @param scope The {@link UiSettingsScope} of the settings to be retrieved.
 * @param query The {@link Query} to execute for filtering the fields.
 * @returns An array of {@link FieldDefinition} objects.
 */
export const useFields = (scope: UiSettingsScope, query?: Query): FieldDefinition[] => {
  const { isCustomSetting, isOverriddenSetting } = useServices();
  const settings = useSettings(scope);
  const fields = getFieldDefinitions(settings, {
    isCustom: (key) => isCustomSetting(key, scope),
    isOverridden: (key) => isOverriddenSetting(key, scope),
  });
  if (query && fields.length) {
    let ast = Ast.create([]);

    query.ast.clauses.forEach((clause) => {
      if (clause.type !== 'field' || Object.keys(fields[0]).includes(clause.field)) {
        ast = ast.addClause(clause);
      } else {
        ast = ast.addClause({
          type: 'term',
          match: 'must',
          value: `${clause.field}:${clause.value}`,
        });
      }
    });

    return Query.execute(new Query(ast, undefined, query.text), fields);
  }
  return fields;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Query } from '@elastic/eui';
import { FieldDefinition } from '@kbn/management-settings-types';
import { SolutionView } from '@kbn/spaces-plugin/common';
import { useFields } from './use_fields';

/**
 * React hook which retrieves the fields for each scope (`namespace` and `global`)
 * and returns two collections of {@link FieldDefinition} objects.
 * @param solution The {@link SolutionView} of the current active space.
 * @param query The {@link Query} to execute for filtering the fields.
 * @returns Two arrays of {@link FieldDefinition} objects.
 */
export const useScopeFields = (
  solution?: SolutionView,
  query?: Query
): [FieldDefinition[], FieldDefinition[]] => {
  const spaceFields = useFields('namespace', solution, query);
  const globalFields = useFields('global', solution, query);
  return [spaceFields, globalFields];
};

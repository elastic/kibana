/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getProjectRoutingFromEsqlQuery } from '@kbn/esql-utils';
import type { ESQLEditorDeps } from '../types';

/** The project picker selection. */
export const usePickerProjectRouting = (): string | undefined => {
  const { cps } = useKibana<ESQLEditorDeps>().services;
  return useObservable(cps?.cpsManager?.getProjectRouting$() ?? EMPTY);
};

/** `SET project_routing` from the query, else the project picker selection. */
export const getEffectiveProjectRouting = (
  query: string,
  pickerProjectRouting: string | undefined
): string | undefined => getProjectRoutingFromEsqlQuery(query) ?? pickerProjectRouting;

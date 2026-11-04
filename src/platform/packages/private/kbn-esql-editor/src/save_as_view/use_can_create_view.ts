/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ESQLEditorDeps } from '../types';

const ESQL_VIEWS_FEATURE_ID = 'esqlViews';
const ESQL_VIEWS_CREATE_CAPABILITY = 'create';

export const useCanCreateView = (isEnabled: boolean): boolean => {
  const {
    services: { core },
  } = useKibana<ESQLEditorDeps>();

  return (
    isEnabled &&
    core?.application?.capabilities?.[ESQL_VIEWS_FEATURE_ID]?.[ESQL_VIEWS_CREATE_CAPABILITY] ===
      true
  );
};

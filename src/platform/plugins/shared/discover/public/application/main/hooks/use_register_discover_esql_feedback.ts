/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { DISCOVER_APP_ID } from '@kbn/deeplinks-analytics';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { useIsEsqlMode } from './use_is_esql_mode';

/**
 * Publishes Discover ES|QL mode to 1Feedback when the optional feedback plugin is present.
 */
export const useRegisterDiscoverEsqlFeedback = () => {
  const { feedback } = useDiscoverServices();
  const isEsqlMode = useIsEsqlMode();

  useEffect(() => {
    return feedback?.setContext(DISCOVER_APP_ID, isEsqlMode ? { isEsql: true } : {});
  }, [feedback, isEsqlMode]);
};

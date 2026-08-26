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
import { i18n } from '@kbn/i18n';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { useIsEsqlMode } from './use_is_esql_mode';

const DISCOVER_ESQL_FEEDBACK_TITLE = i18n.translate('discover.feedback.esqlAppTitle', {
  defaultMessage: 'Analytics - Discover ES|QL',
});

/**
 * Publishes Discover ES|QL mode to 1Feedback when the optional feedback plugin is present.
 */
export const useRegisterDiscoverEsqlFeedback = () => {
  const { feedback } = useDiscoverServices();
  const isEsqlMode = useIsEsqlMode();

  useEffect(() => {
    if (!feedback) {
      return;
    }

    if (isEsqlMode) {
      return feedback.setContext(
        DISCOVER_APP_ID,
        { isEsql: true },
        { title: DISCOVER_ESQL_FEEDBACK_TITLE }
      );
    }

    return feedback.setContext(DISCOVER_APP_ID, {});
  }, [feedback, isEsqlMode]);
};

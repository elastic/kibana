/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldValue } from '@kbn/discover-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import type { DataSourceProfileProvider } from '../../../../profiles';

/**
 * Provides row indicators for security events
 * - Alerts (event.kind === 'signal'): Yellow/warning indicator
 * - Regular events: Default indicator
 */
export const getRowIndicatorProvider: DataSourceProfileProvider['profile']['getRowIndicatorProvider'] =
  (prev) => (params) => {
    const eventKind = getFieldValue(params.record, 'event.kind');

    if (eventKind === 'signal') {
      return {
        ...prev(params),
        color: euiThemeVars.euiColorWarning,
        label: 'alert',
      };
    }

    return {
      ...prev(params),
      color: euiThemeVars.euiColorMediumShade,
      label: 'event',
    };
  };

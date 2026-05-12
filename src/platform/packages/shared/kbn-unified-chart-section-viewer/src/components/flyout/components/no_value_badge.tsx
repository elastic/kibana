/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export const NoValueBadge = () => (
  <EuiBadge>
    {i18n.translate('metricsExperience.overviewTab.noValueLabel', {
      defaultMessage: 'No value',
    })}
  </EuiBadge>
);

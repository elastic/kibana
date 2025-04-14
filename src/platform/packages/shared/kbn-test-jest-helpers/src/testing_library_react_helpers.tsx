/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Components using the @kbn/i18n module require access to the intl context.
 * This is not available when mounting single components in Enzyme.
 * These helper functions aim to address that and wrap a valid,
 * intl context around them.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

export const renderReactTestingLibraryWithI18n = (...args: Parameters<typeof render>) => {
  const [ui, ...remainingRenderArgs] = args;
  // Avoid using { wrapper: I18nProvider } in case the caller adds a custom wrapper.
  return render(<I18nProvider>{ui}</I18nProvider>, ...remainingRenderArgs);
};

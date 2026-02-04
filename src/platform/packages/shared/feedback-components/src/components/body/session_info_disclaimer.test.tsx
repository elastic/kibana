/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { SessionInfoDisclaimer } from './session_info_disclaimer';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/dom';

describe('SessionInfoDisclaimer', () => {
  it('should render session info disclaimer', () => {
    renderWithI18n(<SessionInfoDisclaimer />);

    expect(screen.getByTestId('feedbackSessionInfoDisclaimer')).toBeInTheDocument();
  });
});

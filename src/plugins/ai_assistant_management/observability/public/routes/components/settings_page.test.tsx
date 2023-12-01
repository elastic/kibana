/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '../../helpers/test_helper';
import { SettingsPage } from './settings_page';

describe('Settings Page', () => {
  it('should render tabs', () => {
    const { getByTestId } = render(<SettingsPage />);
    expect(getByTestId('settingsTab')).toBeInTheDocument();
    expect(getByTestId('knowledgeBaseTab')).toBeInTheDocument();
  });
});

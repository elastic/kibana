/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertDeleteRuleSettingsSection } from './rule_settings_section';
import * as i18n from '../translations';

describe('AlertDeleteRuleSettingsSection', () => {
  it('renders the described form group with the correct title and description', () => {
    render(<AlertDeleteRuleSettingsSection />);
    expect(screen.getByText(i18n.RULE_SETTINGS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.RULE_SETTINGS_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.RUN_CLEANUP_TASK })).toBeInTheDocument();
  });

  it('opens the modal when the cleanup button is clicked', async () => {
    render(<AlertDeleteRuleSettingsSection />);
    fireEvent.click(await screen.findByTestId('alert-delete-open-modal-button'));
    expect(await screen.findByTestId('alert-delete-modal')).toBeInTheDocument();
  });
});

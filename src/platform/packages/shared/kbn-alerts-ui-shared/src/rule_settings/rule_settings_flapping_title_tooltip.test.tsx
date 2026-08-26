/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleSettingsFlappingTitleTooltip } from './rule_settings_flapping_title_tooltip';

describe('RuleSettingsFlappingTitleTooltip', () => {
  it('announces the info button with a descriptive accessible name', () => {
    render(
      <I18nProvider>
        <RuleSettingsFlappingTitleTooltip isOpen={false} setIsPopoverOpen={jest.fn()} />
      </I18nProvider>
    );

    expect(
      screen.getByRole('button', { name: 'More information about alert flapping detection' })
    ).toBeInTheDocument();
  });

  it('uses the alert flapping detection title for the open popover', () => {
    render(
      <I18nProvider>
        <RuleSettingsFlappingTitleTooltip isOpen={true} setIsPopoverOpen={jest.fn()} />
      </I18nProvider>
    );

    expect(screen.getByTestId('ruleSettingsFlappingTooltipTitle')).toHaveTextContent(
      'Alert flapping detection'
    );
  });
});

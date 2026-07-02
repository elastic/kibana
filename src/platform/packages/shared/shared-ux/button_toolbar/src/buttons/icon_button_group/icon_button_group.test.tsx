/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { IconButtonGroup } from './icon_button_group';

describe('<IconButtonGroup />', () => {
  it('renders the button with its label as the accessible name', () => {
    renderWithI18n(
      <IconButtonGroup
        legend="Legend"
        buttons={[{ label: 'Text', onClick: jest.fn(), iconType: 'text' }]}
      />
    );

    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument();
  });

  it('does not expose a native browser title when toolTipContent is provided', () => {
    renderWithI18n(
      <IconButtonGroup
        legend="Legend"
        buttons={[
          { label: 'Text', onClick: jest.fn(), iconType: 'text', toolTipContent: 'Tooltip' },
        ]}
      />
    );

    expect(screen.queryByTitle('Text')).not.toBeInTheDocument();
  });

  it('shows the EuiToolTip content on hover when toolTipContent is provided', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <IconButtonGroup
        legend="Legend"
        buttons={[
          { label: 'Text', onClick: jest.fn(), iconType: 'text', toolTipContent: 'Tooltip' },
        ]}
      />
    );

    await user.hover(screen.getByRole('button', { name: 'Text' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Tooltip');
  });
});

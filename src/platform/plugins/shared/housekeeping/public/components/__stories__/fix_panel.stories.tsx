/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FixPanel } from '../fix_panel';
import { OpenInConsoleContext } from '../../metadata';
import { noRetention } from './fixtures';
import { withResourceTypes } from './decorators';

const fix = noRetention.findings[0].fix!;

const meta: Meta<typeof FixPanel> = {
  title: 'Housekeeping/Fix panel',
  component: FixPanel,
  decorators: [withResourceTypes],
};
export default meta;

type Story = StoryObj<typeof FixPanel>;

export const WithEmbeddedConsole: Story = { args: { fix } };

export const ConsoleInANewTab: Story = {
  args: { fix },
  decorators: [
    (StoryComponent) => (
      <OpenInConsoleContext.Provider
        value={{ opensInNewTab: () => true, open: action('open Console in a new tab') }}
      >
        <StoryComponent />
      </OpenInConsoleContext.Provider>
    ),
  ],
};

export const WithoutConsole: Story = {
  args: { fix },
  decorators: [
    (StoryComponent) => (
      <OpenInConsoleContext.Provider value={undefined}>
        <StoryComponent />
      </OpenInConsoleContext.Provider>
    ),
  ],
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiPageTemplate, EuiToolTip } from '@elastic/eui';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { createChromeStorybookStart } from '@kbn/core-chrome-browser-mocks';
import { AppHeaderView } from '../app_header';

interface AppHeaderEditableTitleStoryProps {
  initialTitle: string;
  minimumLength: number;
  width?: number;
  placeholder?: string;
  /** Render a plain, non-editable string title instead of an editable one. */
  readOnly?: boolean;
  /** Delay `onSave` so the inline saving spinner is exercised. */
  asyncSave?: boolean;
}

// Single source of truth: every story renders the title inside the full app header
// (back navigation, badges, metadata, favorite) so its alignment and spacing are shown
// in the context it actually ships in. Args toggle the title's state.
const HeaderWithTitle = ({
  initialTitle,
  minimumLength,
  width,
  placeholder,
  readOnly,
  asyncSave,
}: AppHeaderEditableTitleStoryProps) => {
  const [title, setTitle] = useState(initialTitle);
  const chrome = useMemo(() => createChromeStorybookStart(), []);

  const editableTitle = {
    text: title,
    placeholder,
    onSave: async (nextTitle: string) => {
      if (asyncSave) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (nextTitle.length < minimumLength) {
        return `Use at least ${minimumLength} characters.`;
      }

      action('title-saved')(nextTitle);
      setTitle(nextTitle);
    },
  };

  return (
    <ChromeServiceProvider value={{ chrome }}>
      <div
        css={css`
          width: ${width ? `${width}px` : '100%'};
        `}
      >
        <AppHeaderView
          title={readOnly ? title : editableTitle}
          back={{ href: '/app/management', label: 'Stack Management' }}
          badges={[
            { label: 'Beta', color: 'accent' },
            { label: 'Managed', color: 'primary' },
          ]}
          metadata={[
            { type: 'text', label: 'Created by: analyst' },
            { type: 'button', label: 'Updated 2 minutes ago', onClick: action('metadata-clicked') },
          ]}
          favorite={
            <EuiToolTip content="Favorite" disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label="Favorite"
                iconType="starEmpty"
                onClick={action('favorite')}
              />
            </EuiToolTip>
          }
          sticky={false}
          padding="m"
        />
      </div>
    </ChromeServiceProvider>
  );
};

const meta: Meta<AppHeaderEditableTitleStoryProps> = {
  title: 'Chrome/App Header Editable Title',
  component: HeaderWithTitle,
  decorators: [
    (Story) => (
      <EuiPageTemplate>
        <Story />
      </EuiPageTemplate>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Editable app header title shown in the full header context. Hover the title to ' +
          'reveal the favorite and edit actions over the trailing text; click the pencil to ' +
          'edit. Enter or blur saves, and Escape cancels.',
      },
    },
  },
  args: {
    minimumLength: 4,
    width: 720,
  },
};

export default meta;

type Story = StoryObj<AppHeaderEditableTitleStoryProps>;

export const Default: Story = {
  args: {
    initialTitle: 'System Shells via Services',
  },
};

export const Truncated: Story = {
  args: {
    initialTitle: 'System Shells via Services with a long saved object title',
    width: 420,
  },
};

export const Placeholder: Story = {
  args: {
    initialTitle: '',
    placeholder: 'Untitled dashboard',
  },
};

export const SavingAndError: Story = {
  name: 'Saving and error (async)',
  args: {
    initialTitle: 'System Shells via Services',
    asyncSave: true,
  },
};

export const ReadOnly: Story = {
  name: 'Read-only (string title)',
  args: {
    initialTitle: 'System Shells via Services',
    readOnly: true,
  },
};

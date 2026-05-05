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
import { EuiText } from '@elastic/eui';

import { Announcement } from './announcement';
import type { AnnouncementProps } from './types';
import illustrationUrl from './assets/illustration.svg';

const Illustration = () => <img src={illustrationUrl} alt="" width="100%" height="100%" />;

/**
 * Story args extend the public props with three synthetic booleans so the
 * Controls panel can toggle the optional slots without exposing their inner
 * shape.
 */
type StoryArgs = Omit<AnnouncementProps, 'media' | 'actionProps'> & {
  media: boolean;
  primaryAction: boolean;
  secondaryAction: boolean;
};

const buildAnnouncementProps = (args: StoryArgs): AnnouncementProps => {
  const { media, primaryAction, secondaryAction, ...rest } = args;
  return {
    ...rest,
    media: media ? <Illustration /> : undefined,
    actionProps: {
      primary: primaryAction
        ? { children: 'Primary action', onClick: action('primary onClick') }
        : undefined,
      secondary: secondaryAction
        ? { children: 'Secondary action', onClick: action('secondary onClick') }
        : undefined,
    },
  };
};

const meta: Meta<StoryArgs> = {
  title: 'Display/Announcement',
  component: Announcement,
  args: {
    title: 'Announcement title',
    text: 'Envision a realm where your dreams manifest like a breathtaking mural. Each stroke of the brush symbolizes a hope yearning to be fulfilled, creating a tapestry of aspirations that come to life.',
    size: 'm',
    media: true,
    primaryAction: true,
    secondaryAction: true,
    onDismiss: action('onDismiss'),
  },
  argTypes: {
    size: { control: { type: 'inline-radio' }, options: ['s', 'm', 'l'] },
    media: { control: { type: 'boolean' } },
    primaryAction: { control: { type: 'boolean' } },
    secondaryAction: { control: { type: 'boolean' } },
    onDismiss: { table: { disable: true } },
    children: { table: { disable: true } },
  },
  render: (args) => <Announcement {...buildAnnouncementProps(args)} />,
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {};

const ContainerSizesRender = (args: StoryArgs) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {[500, 1000, 1800].map((width) => (
      <div key={width}>
        <div style={{ fontSize: 12, marginBottom: 4 }}>{width}px</div>
        <div style={{ width }}>
          <Announcement {...buildAnnouncementProps(args)} />
        </div>
      </div>
    ))}
  </div>
);

/** Renders the same announcement at three widths to demo container query zones. */
export const ContainerSizes: Story = {
  render: (args) => <ContainerSizesRender {...args} />,
};

export const WithChildren: Story = {
  args: {
    children: (
      <EuiText size="s" color="subdued">
        Picture each color as a quiet promise — gold for the ambitions you whisper only to yourself,
        blue for the patience that carries you through, crimson for the courage to begin again. The
        mural is never finished, and that is the wonder of it.
      </EuiText>
    ),
  },
  argTypes: {
    children: { table: { disable: false }, control: { type: 'text' } },
  },
};

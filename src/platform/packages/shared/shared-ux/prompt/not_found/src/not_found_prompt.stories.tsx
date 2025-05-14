/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiPageTemplate } from '@elastic/eui';
import React from 'react';
import { StoryObj, StoryFn, Meta } from '@storybook/react';
import mdx from '../README.mdx';

import { NotFoundPrompt } from './not_found_prompt';

export default {
  title: 'Not found/Prompt',
  description:
    'A component to display when the user reaches a page or tries to load a resource that does not exist',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  argTypes: {
    onClick: { action: 'clicked' },
  },
} as Meta;

export const EmptyPage: StoryFn = () => {
  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Section alignment="center">
        <NotFoundPrompt />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export const PageWithSidebar: StoryFn = () => {
  return (
    <EuiPageTemplate panelled>
      <EuiPageTemplate.Sidebar>sidebar</EuiPageTemplate.Sidebar>
      <NotFoundPrompt />
    </EuiPageTemplate>
  );
};

export const CustomActions: StoryObj<{ onClick: () => void }> = {
  render: (args) => {
    return (
      <EuiPageTemplate>
        <EuiPageTemplate.Section alignment="center">
          <NotFoundPrompt
            actions={
              <>
                <EuiButton fill color="primary" onClick={args.onClick}>
                  Go home
                </EuiButton>
                <EuiButton iconType="search" onClick={args.onClick}>
                  Go to discover
                </EuiButton>
              </>
            }
            title="Customizable Title"
            body="Customizable Body"
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    );
  },
};

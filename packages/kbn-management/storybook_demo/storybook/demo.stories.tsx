/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { action } from '@storybook/addon-actions';
import { ComponentMeta } from '@storybook/react';

import { Demo as Component } from '../demo';

export default {
  title: `Storybook Demo`,
  description: 'A simple component',
  argTypes: {
    fieldDisabled: {
      name: 'Field is disabled?',
      control: { type: 'boolean' },
    },
    buttonDisabled: {
      name: 'Button is disabled?',
      control: { type: 'boolean' },
    },
    onClick: { action: 'clicked' },
  },
  parameters: {
    backgrounds: {
      default: 'ghost',
    },
  },
} as ComponentMeta<typeof Component>;

interface DemoStoryProps {
  fieldDisabled: boolean;
  buttonDisabled: boolean;
  onClick: () => void;
}

export const Demo = ({ fieldDisabled, buttonDisabled, onClick }: DemoStoryProps) => {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    action('onChange')({ value: e.target.value });

  return <Component {...{ fieldDisabled, buttonDisabled, onChange, onClick }} />;
};

Demo.args = {
  fieldDisabled: false,
  buttonDisabled: false,
};

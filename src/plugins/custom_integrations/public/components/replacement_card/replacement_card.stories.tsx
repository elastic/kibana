/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Meta } from '@storybook/react';

import { ReplacementCard as ConnectedComponent } from './replacement_card';
import { ReplacementCard as PureComponent } from './replacement_card.component';

export default {
  title: 'Replacement Card',
  description:
    'An accordion panel which can display information about Beats alternatives to a given EPR module, (if available)',
  decorators: [
    (storyFn, { globals }) => (
      <div
        style={{
          padding: 40,
          backgroundColor:
            globals.euiTheme === 'v8.dark' || globals.euiTheme === 'v7.dark' ? '#1D1E24' : '#FFF',
          width: 350,
        }}
      >
        {storyFn()}
      </div>
    ),
  ],
} as Meta;

interface Args {
  eprPackageName: string;
}

const args: Args = {
  eprPackageName: 'ga_beats',
};

const argTypes = {
  eprPackageName: {
    control: {
      type: 'radio',
      options: ['ga_beats', 'beta_beats', 'exp_beats'],
    },
  },
};

export function ReplacementCard({ eprPackageName }: Args) {
  return <ConnectedComponent {...{ eprPackageName }} />;
}

ReplacementCard.args = args;
ReplacementCard.argTypes = argTypes;

export function Component() {
  return (
    <PureComponent
      replacements={[
        { id: 'foo', title: 'Foo', uiInternalPath: '#' },
        { id: 'bar', title: 'Bar', uiInternalPath: '#' },
      ]}
    />
  );
}

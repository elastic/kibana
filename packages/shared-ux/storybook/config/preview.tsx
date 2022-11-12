/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DecoratorFunction } from '@storybook/addons';

import { euiLightVars as theme, euiDarkVars as darkTheme } from '@kbn/ui-theme';
import { EuiPanel, EuiAccordion } from '@elastic/eui';

/* eslint-disable @typescript-eslint/no-namespace,@typescript-eslint/no-empty-interface */
declare global {
  namespace NodeJS {
    interface Global {}
    interface InspectOptions {}
    type ConsoleConstructor = console.ConsoleConstructor;
  }
}
/* eslint-enable */

window.jest = require('jest-mock');

export const parameters = {
  options: {
    storySort: {
      method: 'alphabetical',
      order: [
        'Documentation',
        ['Outline', 'Component Architecture', ['Overview', 'Components and Containers']],
      ],
    },
    showToolbar: true,
  },
  layout: 'fullscreen',
  backgrounds: {
    default: 'empty',
    values: [
      {
        name: 'empty',
        value: theme.euiColorEmptyShade,
      },
      {
        name: 'dark empty',
        value: darkTheme.euiColorEmptyShade,
      },
      {
        name: 'light page',
        value: theme.euiPageBackgroundColor,
      },
      {
        name: 'dark page',
        value: darkTheme.euiPageBackgroundColor,
      },
    ],
  },
};

export const decorators: Array<DecoratorFunction<any>> = [
  (story, context) => {
    const { id, name } = context;
    if (id.startsWith('embeds--')) {
      return (
        <div style={{ margin: '1em 0' }}>
          <EuiAccordion id={id} buttonContent={name} initialIsOpen={true}>
            <EuiPanel color="subdued">{story()}</EuiPanel>
          </EuiAccordion>
        </div>
      );
    }

    return (
      <div style={{ height: '100vh' }}>
        <div style={{ padding: theme.euiSizeXL }}>{story()}</div>
      </div>
    );
  },
];

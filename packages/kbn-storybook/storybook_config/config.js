/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { configure, addDecorator, addParameters } from '@storybook/react';
import { withKnobs } from '@storybook/addon-knobs/react';
import { withInfo } from '@storybook/addon-info';
import { create } from '@storybook/theming';

// If we're running Storyshots, be sure to register the require context hook.
// Otherwise, add the other decorators.
if (process.env.NODE_ENV === 'test') {
  // eslint-disable-next-line
  require('babel-plugin-require-context-hook/register')();
} else {
  // Customize the info for each story.
  addDecorator(
    withInfo({
      inline: true,
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '40px 60px',
        },
      },
    })
  );

  // Add optional knobs to customize each story.
  addDecorator(withKnobs);
}

// Set up the Storybook environment with custom settings.
addParameters({
  options: {
    theme: create({
      base: 'light',
      brandTitle: 'Kibana Storybook',
      brandUrl: 'https://github.com/elastic/kibana/tree/master/packages/kbn-storybook',
    }),
    showPanel: true,
    isFullscreen: false,
    panelPosition: 'bottom',
    isToolshown: true,
  },
});

configure(() => {
  // eslint-disable-next-line
  require('../../../built_assets/storybook/stories.entry.js');
}, module);

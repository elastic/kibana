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

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { withKnobs, boolean } from '@storybook/addon-knobs';
import { PanelOptionsMenu } from '..';

const euiContextDescriptors = {
  id: 'mainMenu',
  title: 'Options',
  items: [
    {
      name: 'Inspect',
      icon: 'inspect',
      onClick: action('onClick(inspect)'),
    },
    {
      name: 'Full screen',
      icon: 'expand',
      onClick: action('onClick(expand)'),
    },
  ],
};

storiesOf('components/PanelOptionsMenu', module)
  .addDecorator(withKnobs)
  .add('default', () => {
    const isViewMode = boolean('isViewMode', false);

    return (
      <div style={{ height: 150 }}>
        <PanelOptionsMenu panelDescriptor={euiContextDescriptors} isViewMode={isViewMode} />
      </div>
    );
  });

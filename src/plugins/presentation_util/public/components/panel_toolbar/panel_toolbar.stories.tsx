/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { PanelToolbar } from './panel_toolbar';

const button = <EuiButton onClick={action('Primary button action')}>Primary action</EuiButton>;

storiesOf('components/PanelToolbar', module)
  .add('default', () => (
    <PanelToolbar
      primaryActionButton={button}
      quickButtons={[]}
      onLibraryClick={action('onLibraryClick')}
    />
  ))
  .add('one quick button', () => (
    <PanelToolbar
      primaryActionButton={button}
      quickButtons={[]}
      onLibraryClick={action('onLibraryClick')}
    />
  ))
  .add('two quick buttons', () => (
    <PanelToolbar
      primaryActionButton={button}
      quickButtons={[]}
      onLibraryClick={action('onLibraryClick')}
    />
  ))
  .add('three quick buttons', () => (
    <PanelToolbar
      primaryActionButton={button}
      quickButtons={[]}
      onLibraryClick={action('onLibraryClick')}
    />
  ))
  .add('four quick buttons', () => (
    <PanelToolbar
      primaryActionButton={button}
      quickButtons={[]}
      onLibraryClick={action('onLibraryClick')}
    />
  ))
  .add('five quick buttons', () => (
    <PanelToolbar
      primaryActionButton={button}
      quickButtons={[]}
      onLibraryClick={action('onLibraryClick')}
    />
  ));

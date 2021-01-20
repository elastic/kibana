/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { PanelToolbar } from './panel_toolbar';

storiesOf('components/PanelToolbar', module).add('default', () => (
  <PanelToolbar
    onAddPanelClick={action('onAddPanelClick')}
    onLibraryClick={action('onLibraryClick')}
  />
));

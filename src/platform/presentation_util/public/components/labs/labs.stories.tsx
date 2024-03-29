/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';

import { LabsBeakerButton } from './labs_beaker_button';
import { LabsFlyout } from './labs_flyout';

export default {
  title: 'Labs/Flyout',
  description:
    'A set of components used for providing Labs controls and projects in another solution.',
  argTypes: {
    canSetAdvancedSettings: {
      control: 'boolean',
      defaultValue: true,
    },
  },
};

export function BeakerButton() {
  return <LabsBeakerButton />;
}

export function Flyout() {
  return <LabsFlyout onClose={action('onClose')} />;
}

export function EmptyFlyout() {
  return <LabsFlyout onClose={action('onClose')} solutions={[]} />;
}

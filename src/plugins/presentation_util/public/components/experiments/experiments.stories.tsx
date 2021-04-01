/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';

import { ExperimentsButton } from './experiments_button';
import { ExperimentsFlyout } from './experiments_flyout';

export default {
  title: 'Experiments/Flyout',
  description: 'A set of components used for providing Experiment controls in another.',
  argTypes: {},
};

export function BeakerButton() {
  return <ExperimentsButton />;
}

export function Flyout() {
  return <ExperimentsFlyout onClose={action('onClose')} />;
}

export function EmptyFlyout() {
  return <ExperimentsFlyout onClose={action('onClose')} solutions={[]} />;
}

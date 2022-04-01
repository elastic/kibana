/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { EuiForm } from '@elastic/eui';
import { ComponentStory } from '@storybook/react';
import { CustomizablePalette, CustomizablePaletteProps } from '../palette_configuration';
import { getPaletteRegistry } from './palettes';

export default {
  title: 'CustomizablePalette',
  component: CustomizablePalette,
  decorators: [(story: Function) => <EuiForm>{story()}</EuiForm>],
};

const Template: ComponentStory<FC<CustomizablePaletteProps>> = (args) => (
  <CustomizablePalette {...args} />
);

export const Default = Template.bind({});

Default.args = {
  palettes: getPaletteRegistry(),
  activePalette: {
    type: 'palette',
    name: 'custom',
    params: {
      steps: 1,
      maxSteps: 10,
      continuity: 'none',
    },
  },
  dataBounds: {
    min: 0,
    max: 100,
  },
  showExtraActions: true,
  showRangeTypeSelector: true,
  disableSwitchingContinuity: false,
  setPalette: () => {},
};

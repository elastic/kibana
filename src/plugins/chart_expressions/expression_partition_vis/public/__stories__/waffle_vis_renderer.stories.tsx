/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { ComponentStory } from '@storybook/react';
import { Render } from '@kbn/presentation-util-plugin/public/__stories__';
import { getPartitionVisRenderer } from '../expression_renderers';
import { ChartTypes, RenderValue } from '../../common/types';
import { palettes, theme, getStartDeps } from '../__mocks__';
import { waffleArgTypes, waffleConfig, data } from './shared';

const containerSize = {
  width: '700px',
  height: '700px',
};

const PartitionVisRenderer = () => getPartitionVisRenderer({ palettes, theme, getStartDeps });

type Props = {
  visType: RenderValue['visType'];
  syncColors: RenderValue['syncColors'];
} & RenderValue['visConfig'];

const PartitionVis: ComponentStory<FC<Props>> = ({
  visType,
  syncColors,
  children,
  ...visConfig
}) => (
  <Render
    renderer={PartitionVisRenderer}
    config={{ visType, syncColors, visConfig, visData: data }}
    {...containerSize}
  />
);

export default {
  title: 'renderers/waffleVis',
  component: PartitionVis,
  argTypes: waffleArgTypes,
};

const Default = PartitionVis.bind({});
Default.args = { ...waffleConfig, visType: ChartTypes.WAFFLE, syncColors: false };

export { Default };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, ComponentType } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiEmptyPrompt, EuiForm, IconType } from '@elastic/eui';
import { ComponentStory } from '@storybook/react';

import {
  IconCircle,
  IconTriangle,
  EuiIconAxisBottom,
  EuiIconAxisLeft,
  EuiIconAxisRight,
  EuiIconAxisTop,
  IconChartArea,
  IconChartAreaPercentage,
  IconChartAreaStacked,
  IconChartBar,
  IconChartBarAnnotations,
  IconChartBarHorizontal,
  IconChartBarHorizontalPercentage,
  IconChartBarHorizontalStacked,
  IconChartBarPercentage,
  IconChartBarReferenceLine,
  IconChartBarStacked,
  IconChartDatatable,
  IconChartDonut,
  IconChartLine,
  IconChartMetric,
  IconChartMixedXy,
  IconChartMosaic,
  IconChartPie,
  IconChartTreemap,
  IconChartWaffle,
  DropIllustration,
  GlobeIllustration,
  EuiIconLegend,
  IconRegionMap,
  IconChartHeatmap,
  IconChartHorizontalBullet,
  IconChartVerticalBullet,
} from '../..';

export default {
  title: 'Chart Icons',
  decorators: [(story: Function) => <EuiForm>{story()}</EuiForm>],
};

const IconsArray: Array<{
  title: string;
  Component: ComponentType<{ title: string; titleId: string }>;
}> = [
  {
    title: 'EuiIconAxisBottom',
    Component: EuiIconAxisBottom,
  },
  {
    title: 'EuiIconAxisLeft',
    Component: EuiIconAxisLeft,
  },
  {
    title: 'EuiIconAxisRight',
    Component: EuiIconAxisRight,
  },
  {
    title: 'EuiIconAxisTop',
    Component: EuiIconAxisTop,
  },
  {
    title: 'IconChartArea',
    Component: IconChartArea,
  },
  {
    title: 'IconChartAreaPercentage',
    Component: IconChartAreaPercentage,
  },
  {
    title: 'IconChartAreaStacked',
    Component: IconChartAreaStacked,
  },
  {
    title: 'IconChartBar',
    Component: IconChartBar,
  },
  {
    title: 'IconChartBarAnnotations',
    Component: IconChartBarAnnotations,
  },
  {
    title: 'IconChartBarHorizontal',
    Component: IconChartBarHorizontal,
  },
  {
    title: 'IconChartBarHorizontalPercentage',
    Component: IconChartBarHorizontalPercentage,
  },
  {
    title: 'IconChartBarHorizontalStacked',
    Component: IconChartBarHorizontalStacked,
  },
  {
    title: 'IconChartBarPercentage',
    Component: IconChartBarPercentage,
  },
  {
    title: 'IconChartBarReferenceLine',
    Component: IconChartBarReferenceLine,
  },
  {
    title: 'IconChartBarStacked',
    Component: IconChartBarStacked,
  },
  {
    title: 'IconChartDatatable',
    Component: IconChartDatatable,
  },
  {
    title: 'IconChartDonut',
    Component: IconChartDonut,
  },
  {
    title: 'IconChartLine',
    Component: IconChartLine,
  },
  {
    title: 'IconChartMetric',
    Component: IconChartMetric,
  },
  {
    title: 'IconChartMixedXy',
    Component: IconChartMixedXy,
  },
  {
    title: 'IconChartMosaic',
    Component: IconChartMosaic,
  },
  {
    title: 'IconChartPie',
    Component: IconChartPie,
  },
  {
    title: 'IconChartTreemap',
    Component: IconChartTreemap,
  },
  {
    title: 'IconChartWaffle',
    Component: IconChartWaffle,
  },
  {
    title: 'DropIllustration',
    Component: DropIllustration,
  },
  {
    title: 'GlobeIllustration',
    Component: GlobeIllustration,
  },
  {
    title: 'EuiIconLegend',
    Component: EuiIconLegend,
  },
  {
    title: 'IconCircle',
    Component: IconCircle,
  },
  {
    title: 'IconTriangle',
    Component: IconTriangle,
  },
  {
    title: 'IconRegionMap',
    Component: IconRegionMap,
  },
  {
    title: 'IconChartHeatmap',
    Component: IconChartHeatmap,
  },
  {
    title: 'IconChartHorizontalBullet',
    Component: IconChartHorizontalBullet,
  },
  {
    title: 'IconChartVerticalBullet',
    Component: IconChartVerticalBullet,
  },
];

interface RootComponentProps {
  icons: typeof IconsArray;
}

function RootComponent(props: RootComponentProps) {
  return (
    <EuiFlexGroup direction={'row'} responsive={false} wrap={true}>
      {props.icons.map((i) => (
        <EuiFlexItem>
          <EuiEmptyPrompt
            style={{ minWidth: '250px' }}
            hasBorder={true}
            hasShadow={true}
            iconType={i.Component as IconType}
            title={<>{i.title}</>}
            titleSize={'s'}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

const Template: ComponentStory<FC<RootComponentProps>> = (args) => <RootComponent {...args} />;

export const Default = Template.bind({});

Default.args = {
  icons: IconsArray,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import { ArgTypes } from '@storybook/addons';
import { EmptySizeRatios, LegendDisplay } from '../../../common';
import { ChartTypes } from '../../../common/types';

const visConfigName = 'visConfig';

export const argTypes: ArgTypes = {
  addTooltip: {
    name: `${visConfigName}.addTooltip`,
    description: 'Add tooltip on hover',
    type: { name: 'boolean', required: false },
    table: { type: { summary: 'boolean' }, defaultValue: { summary: true } },
    control: { type: 'boolean' },
  },
  legendDisplay: {
    name: `${visConfigName}.legendDisplay`,
    description: 'Legend mode of displaying',
    type: { name: 'string', required: false },
    table: { type: { summary: 'string' }, defaultValue: { summary: LegendDisplay.HIDE } },
    options: Object.values(LegendDisplay),
    control: { type: 'select' },
  },
  legendPosition: {
    name: `${visConfigName}.legendPosition`,
    description: 'Legend position',
    type: { name: 'string', required: false },
    table: { type: { summary: 'string' }, defaultValue: { summary: Position.Bottom } },
    options: Object.values(Position),
    control: { type: 'select' },
  },
  truncateLegend: {
    name: `${visConfigName}.truncateLegend`,
    description: 'Truncate too long legend',
    type: { name: 'boolean', required: false },
    table: { type: { summary: 'boolean' }, defaultValue: { summary: true } },
    control: { type: 'boolean' },
  },
  maxLegendLines: {
    name: `${visConfigName}.maxLegendLines`,
    description: 'Legend maximum number of lines',
    type: { name: 'number', required: false },
    table: { type: { summary: 'number' } },
    control: { type: 'number' },
  },
  palette: {
    name: `${visConfigName}.palette`,
    description: 'Palette',
    type: { name: 'palette', required: false },
    table: { type: { summary: 'object' } },
    control: { type: 'object' },
  },
  labels: {
    name: `${visConfigName}.labels`,
    description: 'Labels configuration',
    type: { name: 'object', required: false },
    table: {
      type: {
        summary: 'object',
        detail: `Labels configuration consists of further fields:
  - show: boolean. Default: true.
  - position: string. Options: 'default', 'inside'. Default: 'default'.
  - values: boolean. Default: true.
  - percentDecimals: number. Default: 2.
  - last_level: boolean. Default: false. DEPRECATED.
  - truncate: number. Default: null.
  - valuesFormat: string. Options: 'percent', 'value'. Default: percent.
        `,
      },
    },
    control: { type: 'object' },
  },
  dimensions: {
    name: `${visConfigName}.dimensions`,
    description: 'dimensions configuration',
    type: { name: 'object', required: false },
    table: {
      type: {
        summary: 'object',
        detail: `Dimensions configuration consists of two fields:
  - metric: visdimension.
  - buckets: visdimension[].
        `,
      },
    },
    control: { type: 'object' },
  },
};

export const pieDonutArgTypes: ArgTypes = {
  ...argTypes,
  visType: {
    name: `visType`,
    description: 'Type of the chart',
    type: { name: 'string', required: false },
    table: {
      type: { summary: 'string' },
      defaultValue: { summary: `${ChartTypes.PIE} | ${ChartTypes.DONUT}` },
    },
    control: { type: 'text', disable: true },
  },
  isDonut: {
    name: `${visConfigName}.isDonut`,
    description: 'Render a donut chart',
    type: { name: 'boolean', required: false },
    table: { type: { summary: 'boolean' }, defaultValue: { summary: false } },
    control: { type: 'boolean' },
  },
  emptySizeRatio: {
    name: `${visConfigName}.emptySizeRatio`,
    description: 'The hole size of the donut chart',
    type: { name: 'number', required: false },
    table: { type: { summary: 'number' }, defaultValue: { summary: EmptySizeRatios.SMALL } },
    options: [EmptySizeRatios.SMALL, EmptySizeRatios.MEDIUM, EmptySizeRatios.LARGE],
    control: { type: 'select' },
  },
  distinctColors: {
    name: `${visConfigName}.distinctColors`,
    description: 'Enable distinct colors',
    type: { name: 'boolean', required: false },
    table: { type: { summary: 'boolean' }, defaultValue: { summary: false } },
    control: { type: 'boolean' },
  },
  respectSourceOrder: {
    name: `${visConfigName}.respectSourceOrder`,
    description: 'Save default order of the incomming data',
    type: { name: 'boolean', required: false },
    table: { type: { summary: 'boolean' }, defaultValue: { summary: true } },
    control: { type: 'boolean' },
  },
  startFromSecondLargestSlice: {
    name: `${visConfigName}.startFromSecondLargestSlice`,
    description: 'Start placement of slices from the second largest slice',
    type: { name: 'boolean', required: false },
    table: { type: { summary: 'boolean' }, defaultValue: { summary: true } },
    control: { type: 'boolean' },
  },
  nestedLegend: {
    name: `${visConfigName}.nestedLegend`,
    description: 'Enable nested legend',
    type: { name: 'boolean', required: false },
    table: { type: { summary: 'boolean' }, defaultValue: { summary: false } },
    control: { type: 'boolean' },
  },
};

export const treemapArgTypes: ArgTypes = {
  visType: {
    name: `visType`,
    description: 'Type of the chart',
    type: { name: 'string', required: false },
    table: {
      type: { summary: 'string' },
      defaultValue: { summary: `${ChartTypes.TREEMAP}` },
    },
    control: { type: 'text', disable: true },
  },
  ...argTypes,
  nestedLegend: {
    name: `${visConfigName}.nestedLegend`,
    description: 'Enable nested legend',
    type: { name: 'boolean', required: false },
    table: { type: { summary: 'boolean' }, defaultValue: { summary: false } },
    control: { type: 'boolean' },
  },
};

export const mosaicArgTypes: ArgTypes = {
  visType: {
    name: `visType`,
    description: 'Type of the chart',
    type: { name: 'string', required: false },
    table: {
      type: { summary: 'string' },
      defaultValue: { summary: `${ChartTypes.MOSAIC}` },
    },
    control: { type: 'text', disable: true },
  },
  ...argTypes,
  nestedLegend: {
    name: `${visConfigName}.nestedLegend`,
    description: 'Enable nested legend',
    type: { name: 'boolean', required: false },
    table: { type: { summary: 'boolean' }, defaultValue: { summary: false } },
    control: { type: 'boolean' },
  },
};

export const waffleArgTypes: ArgTypes = {
  visType: {
    name: `visType`,
    description: 'Type of the chart',
    type: { name: 'string', required: false },
    table: {
      type: { summary: 'string' },
      defaultValue: { summary: `${ChartTypes.WAFFLE}` },
    },
    control: { type: 'text', disable: true },
  },
  ...argTypes,
  showValuesInLegend: {
    name: `${visConfigName}.nestedLegend`,
    description: 'Enable displaying values in the legend',
    type: { name: 'boolean', required: false },
    table: { type: { summary: 'boolean' }, defaultValue: { summary: false } },
    control: { type: 'boolean' },
  },
};

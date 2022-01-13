/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { CSSProperties } from 'react';
import { storiesOf } from '@storybook/react';
import { Style } from 'src/plugins/expressions';
import { getMetricRenderer } from '../metric_renderer';
import { Render } from '../../../../presentation_util/public/__stories__';
import { MetricRendererConfig } from '../../../common';

const labelFontSpec: CSSProperties = {
  fontFamily: "Baskerville, Georgia, Garamond, 'Times New Roman', Times, serif",
  fontWeight: 'normal',
  fontStyle: 'italic',
  textDecoration: 'none',
  textAlign: 'center',
  fontSize: '24px',
  lineHeight: '1',
  color: '#000000',
};

const metricFontSpec: CSSProperties = {
  fontFamily:
    "Optima, 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif",
  fontWeight: 'bold',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
  fontSize: '48px',
  lineHeight: '1',
  color: '#b83c6f',
};

storiesOf('renderers/Metric', module)
  .add('with null metric', () => {
    const config: MetricRendererConfig = {
      metric: null,
      metricFont: {} as Style,
      labelFont: {} as Style,
      label: '',
      metricFormat: '',
    };
    return <Render renderer={getMetricRenderer()} config={config} />;
  })
  .add('with number metric', () => {
    const config: MetricRendererConfig = {
      metric: '12345.6789',
      metricFont: metricFontSpec as Style,
      labelFont: {} as Style,
      label: '',
      metricFormat: '',
    };
    return <Render renderer={getMetricRenderer()} config={config} />;
  })
  .add('with string metric', () => {
    const config: MetricRendererConfig = {
      metric: '$12.34',
      metricFont: metricFontSpec as Style,
      labelFont: labelFontSpec as Style,
      label: '',
      metricFormat: '',
    };
    return <Render renderer={getMetricRenderer()} config={config} />;
  })
  .add('with label', () => {
    const config: MetricRendererConfig = {
      metric: '$12.34',
      metricFont: metricFontSpec as Style,
      labelFont: labelFontSpec as Style,
      label: 'Average price',
      metricFormat: '',
    };
    return <Render renderer={getMetricRenderer()} config={config} />;
  })
  .add('with number metric and a specified format', () => {
    const config: MetricRendererConfig = {
      metric: '-0.0024',
      metricFont: metricFontSpec as Style,
      labelFont: labelFontSpec as Style,
      label: 'Average price',
      metricFormat: '0.00%',
    };
    return <Render renderer={getMetricRenderer()} config={config} />;
  })
  .add('with formatted string metric and a specified format', () => {
    const config: MetricRendererConfig = {
      metric: '$10000000.00',
      metricFont: metricFontSpec as Style,
      labelFont: labelFontSpec as Style,
      label: 'Total Revenue',
      metricFormat: '$0a',
    };
    return <Render renderer={getMetricRenderer()} config={config} />;
  })
  .add('with invalid metricFont', () => {
    const config: MetricRendererConfig = {
      metric: '$10000000.00',
      metricFont: metricFontSpec as Style,
      labelFont: labelFontSpec as Style,
      label: 'Total Revenue',
      metricFormat: '$0a',
    };
    return <Render renderer={getMetricRenderer()} config={config} />;
  });

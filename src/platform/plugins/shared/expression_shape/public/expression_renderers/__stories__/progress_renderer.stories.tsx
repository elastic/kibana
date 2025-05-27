/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Render } from '@kbn/presentation-util-plugin/public/__stories__';
import { coreMock } from '@kbn/core/public/mocks';
import { getProgressRenderer } from '../progress_renderer';
import { Progress } from '../../../common';

export default {
  title: 'renderers/progress',
};

export const Default = {
  render: () => {
    const config = {
      barColor: '#bc1234',
      barWeight: 20,
      font: {
        css: '',
        spec: {},
        type: 'style' as 'style',
      },
      label: '66%',
      max: 1,
      shape: Progress.UNICORN,
      value: 0.66,
      valueColor: '#000',
      valueWeight: 15,
    };

    return <Render renderer={getProgressRenderer(coreMock.createStart())} config={config} />;
  },

  name: 'default',
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { Render } from '../../../../presentation_util/public/__stories__';
import { getProgressRenderer } from '../progress_renderer';
import { Progress } from '../../../common';

storiesOf('renderers/progress', module).add('default', () => {
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

  return <Render renderer={getProgressRenderer()} config={config} />;
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { getShapeRenderer } from '../';
import { Render } from '../../../../presentation_util/public/__stories__';
import { Shape } from '../../../common/types';

storiesOf('renderers/shape', module).add('default', () => {
  const config = {
    type: 'shape' as 'shape',
    border: '#FFEEDD',
    borderWidth: 8,
    shape: Shape.BOOKMARK,
    fill: '#112233',
    maintainAspect: true,
  };

  return <Render renderer={getShapeRenderer()} config={config} />;
});

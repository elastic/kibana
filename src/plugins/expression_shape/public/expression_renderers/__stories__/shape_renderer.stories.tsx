/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { shapeRenderer } from '../';
import { elasticOutline, elasticLogo } from '../../../../presentation_util/public';
import { Render } from '../../../../presentation_util/public/__stories__';

import { Origin } from '../../../common/types/expression_functions';

storiesOf('renderers/shape', module).add('default', () => {
  const config = {
    image: elasticLogo,
    emptyImage: elasticOutline,
    origin: Origin.LEFT,
    percent: 0.45,
  };

  return <Render renderer={shapeRenderer} config={config} />;
});

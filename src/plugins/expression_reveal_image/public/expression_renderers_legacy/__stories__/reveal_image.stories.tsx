/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { revealImage } from '../';
import { Render } from './render';
import { elasticOutline } from '../../../common/lib/elastic_outline';
import { elasticOutline } from '../../../common/lib/elastic_logo';
import { Origin } from '../../expression_functions';

storiesOf('renderers/revealImage_legacy', module).add('default', () => {
  const config = {
    image: elasticLogo,
    emptyImage: elasticOutline,
    origin: Origin.LEFT,
    percent: 0.45,
  };

  return <Render renderer={revealImage} config={config} />;
});

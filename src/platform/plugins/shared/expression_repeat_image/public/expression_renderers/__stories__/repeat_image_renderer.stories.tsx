/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { coreMock } from '@kbn/core/public/mocks';
import { Render } from '@kbn/presentation-util-plugin/public/__stories__';
import { elasticLogo, elasticOutline } from '@kbn/expression-utils';
import { getRepeatImageRenderer } from '../repeat_image_renderer';

const Renderer = () => {
  const config = {
    count: 42,
    image: elasticLogo,
    size: 20,
    max: 60,
    emptyImage: elasticOutline,
  };

  return (
    <Render
      renderer={getRepeatImageRenderer(coreMock.createStart())}
      config={config}
      width="400px"
    />
  );
};

storiesOf('enderers/repeatImage', module).add(
  'default',
  (_, props) => (
    <Renderer />
  ),
  { decorators: [] }
);

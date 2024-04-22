/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { Render, waitFor } from '@kbn/presentation-util-plugin/public/__stories__';
import { coreMock } from '@kbn/core/public/mocks';
import { getElasticLogo } from '@kbn/presentation-util-plugin/common';
import { getImageRenderer } from '../image_renderer';
import { ImageMode } from '../../../common';

const { theme } = coreMock.createStart();

const Renderer = ({ elasticLogo }: { elasticLogo: string }) => {
  const config = {
    dataurl: elasticLogo,
    mode: ImageMode.COVER,
  };

  return <Render renderer={getImageRenderer(theme)} config={config} width="500px" height="500px" />;
};

storiesOf('renderers/image', module).add(
  'default',
  (_, props) => {
    return <Renderer elasticLogo={props?.elasticLogo} />;
  },
  { decorators: [waitFor(getElasticLogo())] }
);

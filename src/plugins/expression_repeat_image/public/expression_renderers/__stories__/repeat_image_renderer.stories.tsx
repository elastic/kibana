/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { Render } from '@kbn/presentation-util-plugin/public/__stories__';
import { getElasticLogo, getElasticOutline } from '@kbn/presentation-util-plugin/common/lib';
import { waitFor } from '@kbn/presentation-util-plugin/public/__stories__';
import { getRepeatImageRenderer } from '../repeat_image_renderer';

const Renderer = ({
  elasticLogo,
  elasticOutline,
}: {
  elasticLogo: string;
  elasticOutline: string;
}) => {
  const config = {
    count: 42,
    image: elasticLogo,
    size: 20,
    max: 60,
    emptyImage: elasticOutline,
  };

  return <Render renderer={getRepeatImageRenderer()} config={config} width="400px" />;
};

storiesOf('enderers/repeatImage', module).add(
  'default',
  (_, props) => (
    <Renderer elasticLogo={props?.elasticLogo} elasticOutline={props?.elasticOutline} />
  ),
  { decorators: [waitFor(getElasticLogo()), waitFor(getElasticOutline())] }
);

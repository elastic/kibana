/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { getElasticOutline, getElasticLogo } from '@kbn/presentation-util-plugin/public';
import { Render, waitFor } from '@kbn/presentation-util-plugin/public/__stories__';
import { getRevealImageRenderer } from '..';
import { Origin } from '../../../common/types/expression_functions';

const Renderer = ({
  elasticLogo,
  elasticOutline,
}: {
  elasticLogo: string;
  elasticOutline: string;
}) => {
  const config = {
    image: elasticLogo,
    emptyImage: elasticOutline,
    origin: Origin.LEFT,
    percent: 0.45,
  };
  return <Render renderer={getRevealImageRenderer()} config={config} />;
};

storiesOf('renderers/revealImage', module).add(
  'default',
  (_, props) => (
    <Renderer elasticLogo={props?.elasticLogo} elasticOutline={props?.elasticOutline} />
  ),
  { decorators: [waitFor(getElasticLogo()), waitFor(getElasticOutline())] }
);

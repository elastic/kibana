/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { revealImageRenderer } from '../';
import { getElasticOutline, getElasticLogo } from '../../../../presentation_util/public';
import { Render, waitFor } from '../../../../presentation_util/public/__stories__';
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
  return <Render renderer={revealImageRenderer} config={config} />;
};

storiesOf('renderers/revealImage', module).add(
  'default',
  (_, props) => (
    <Renderer elasticLogo={props?.elasticLogo} elasticOutline={props?.elasticOutline} />
  ),
  { decorators: [waitFor(getElasticLogo()), waitFor(getElasticOutline())] }
);

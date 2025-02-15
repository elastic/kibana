/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { getElasticOutline, getElasticLogo } from '@kbn/presentation-util-plugin/common';
import { Render, waitFor } from '@kbn/presentation-util-plugin/public/__stories__';
import type { Meta } from '@storybook/react';
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

  return <Render renderer={getRevealImageRenderer(coreMock.createStart())} config={config} />;
};

export default {
  title: 'renderers/revealImage',
};

export const Default = {
  render: (_, props) => (
    <Renderer elasticLogo={props?.elasticLogo} elasticOutline={props?.elasticOutline} />
  ),

  name: 'default',
  decorators: [waitFor(getElasticLogo()), waitFor(getElasticOutline())],
} as Meta;

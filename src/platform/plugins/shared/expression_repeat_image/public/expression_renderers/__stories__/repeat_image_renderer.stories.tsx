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
import { Render, waitFor } from '@kbn/presentation-util-plugin/public/__stories__';
import type { Meta } from '@storybook/react';
import { getElasticLogo, getElasticOutline } from '@kbn/presentation-util-plugin/common';
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

  return (
    <Render
      renderer={getRepeatImageRenderer(coreMock.createStart())}
      config={config}
      width="400px"
    />
  );
};

export default {
  title: 'enderers/repeatImage',
};

export const Default = {
  render: (_, props) => (
    <Renderer elasticLogo={props?.elasticLogo} elasticOutline={props?.elasticOutline} />
  ),

  name: 'default',
  decorators: [waitFor(getElasticLogo()), waitFor(getElasticOutline())],
} as Meta;

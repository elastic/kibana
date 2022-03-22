/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { applicationServiceFactory } from '@kbn/shared-ux-storybook';

import {
  ElasticAgentCardComponent,
  ElasticAgentCardComponentProps,
} from './elastic_agent_card.component';

export default {
  title: 'Elastic Agent Data Card',
  description: 'A solution-specific wrapper around NoDataCard, to be used on NoData page',
};

type Params = Pick<ElasticAgentCardComponentProps, 'canAccessFleet'>;

export const PureComponent = (params: Params) => {
  const { currentAppId$, navigateToUrl } = applicationServiceFactory();
  return (
    <ElasticAgentCardComponent
      {...params}
      currentAppId$={currentAppId$}
      navigateToUrl={navigateToUrl}
    />
  );
};

PureComponent.argTypes = {
  canAccessFleet: {
    control: 'boolean',
    defaultValue: true,
  },
};

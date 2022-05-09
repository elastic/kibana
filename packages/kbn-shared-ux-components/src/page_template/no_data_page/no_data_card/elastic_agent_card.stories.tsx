/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  ElasticAgentCardComponent as Component,
  ElasticAgentCardComponentProps as ComponentProps,
} from './elastic_agent_card.component';

import { ElasticAgentCard } from './elastic_agent_card';

export default {
  title: 'Page Template/No Data/Elastic Agent Data Card',
  description: 'A solution-specific wrapper around NoDataCard, to be used on NoData page',
};

type Params = Pick<ComponentProps, 'canAccessFleet'>;

export const PureComponent = (params: Params) => {
  return <Component {...params} />;
};

PureComponent.argTypes = {
  canAccessFleet: {
    control: 'boolean',
    defaultValue: true,
  },
};

export const ConnectedComponent = () => {
  return <ElasticAgentCard href="#" />;
};

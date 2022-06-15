/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { Params, getStoryArgTypes, getStoryServices } from './mocks';

import { NoDataElasticAgentCard as NoDataElasticAgentCardComponent } from './no_data_elastic_agent_card.component';
import { NoDataElasticAgentCard } from './no_data_elastic_agent_card';
import { NoDataElasticAgentCardProvider } from './services';

import mdx from '../README.mdx';

export default {
  title: 'Card/No Data Elastic Agent',
  description: 'A solution-specific wrapper around `NoDataCard`, to be used on `NoData` page',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const argTypes = getStoryArgTypes();

export const Component = (params: Params) => {
  return <NoDataElasticAgentCardComponent {...params} />;
};

Component.argTypes = argTypes;

export const ConnectedComponent = (params: Params) => {
  return (
    <NoDataElasticAgentCardProvider {...getStoryServices(params)}>
      <NoDataElasticAgentCard {...params} />
    </NoDataElasticAgentCardProvider>
  );
};

ConnectedComponent.argTypes = argTypes;

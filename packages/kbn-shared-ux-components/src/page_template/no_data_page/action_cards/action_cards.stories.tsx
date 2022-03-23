/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { applicationServiceFactory } from '@kbn/shared-ux-storybook';
import React from 'react';
import { NoDataCard } from '../no_data_card';
import { ActionCards } from './action_cards';
import { ElasticAgentCardComponent } from '../no_data_card/elastic_agent_card.component';

export default {
  title: 'Page Template/No Data Page/Elastic Action Cards',
  description: 'A group of ElasticAgentCards or NoDataCards, to be used on NoData page',
};

export const PureComponent = () => {
  const action = {
    recommended: false,
    button: 'Button',
    onClick: () => {},
  };
  const { currentAppId$, navigateToUrl } = applicationServiceFactory();
  const card1 = <NoDataCard key={'card1'} title={'No Data Card'} {...action} />;
  const card2 = (
    <ElasticAgentCardComponent
      canAccessFleet={true}
      key={'card2'}
      title={'Elastic Agent Card'}
      navigateToUrl={navigateToUrl}
      currentAppId$={currentAppId$}
      {...action}
    />
  );
  return <ActionCards actionCards={[card1, card2]} />;
};

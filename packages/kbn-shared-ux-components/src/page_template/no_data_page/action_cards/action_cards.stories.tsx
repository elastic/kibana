/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { NoDataCard } from '../no_data_card';
import { ActionCards } from './action_cards';

export default {
  title: 'Elastic Action Cards',
  description: 'A group of ElasticAgentCards or NoDataCards, to be used on NoData page',
};

export const PureComponent = () => {
  const action = {
    recommended: false,
    button: 'Button',
    onClick: () => {},
  };
  const card1 = <NoDataCard key={'card1'} title={'Card 1'} {...action} />;
  const card2 = <NoDataCard key={'card2'} title={'Card 2'} {...action} />;
  return <ActionCards actionCards={[card1, card2]} />;
};

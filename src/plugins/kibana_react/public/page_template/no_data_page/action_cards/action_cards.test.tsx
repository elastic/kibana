/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { ReactElement } from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ElasticAgentCard, NoDataCard } from '../no_data_card';
import { ActionCards } from './action_cards';

describe('ActionCards', () => {
  const onClick = jest.fn();
  const action = {
    recommended: false,
    button: 'Button text',
    onClick,
  };
  const card = <NoDataCard key={'key'} {...action} />;
  const cards: Array<ReactElement<typeof NoDataCard> | ReactElement<typeof ElasticAgentCard>> = [];
  cards.push(<div key={'first'}>{card}</div>);
  cards.push(<div key={'second'}>{card}</div>);

  test('renders correctly', () => {
    const component = shallowWithIntl(<ActionCards actionCards={cards} />);
    const actionCards = component.find('div');
    expect(actionCards.length).toBe(2);
    expect(actionCards.at(0).key()).toBe('first');
    expect(actionCards.at(1).key()).toBe('second');
  });
});

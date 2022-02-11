/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ActionCard } from './action_card';
import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { NoDataCard } from '../no_data_card';
import { ActionCards } from './action_cards';

describe('ActionCards', () => {
  const onClick = jest.fn();
  const action = {
    recommended: false,
    button: 'Button text',
    onClick,
  };
  const card = <NoDataCard key={'key'} {...action} />;
  const actionCard1 = <ActionCard key={'first'} child={card} />;
  const actionCard2 = <ActionCard key={'second'} child={card} />;

  test('renders correctly', () => {
    const component = shallowWithIntl(<ActionCards actionCards={[actionCard1, actionCard2]} />);
    const actionCards = component.find(ActionCard);
    expect(actionCards.length).toBe(2);
    expect(actionCards.at(0).key()).toBe('first');
    expect(actionCards.at(1).key()).toBe('second');
  });
});

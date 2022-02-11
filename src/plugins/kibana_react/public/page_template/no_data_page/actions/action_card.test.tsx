/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ActionCard } from '../actions';
import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ElasticAgentCard, NoDataCard } from '../no_data_card';

describe('ActionCard', () => {
  const onClick = jest.fn();
  const action = {
    recommended: false,
    button: 'Button text',
    onClick,
  };

  test('renders NoDataCard correctly', () => {
    const card = <NoDataCard key={'key'} {...action} />;
    const component = shallowWithIntl(<ActionCard key={'myKey'} child={card} />);
    const child = component.find(NoDataCard);
    expect(child.length).toBe(1);
    expect(child.at(0).props().onClick).toBe(onClick);
    expect(child.at(0).props().button).toBe('Button text');
  });

  test('renders ElasticAgentCard correctly', () => {
    const card = (
      <ElasticAgentCard
        key={'elastic'}
        {...{ ...action, button: 'Elastic agent button' }}
        solution={'elastic'}
      />
    );
    const component = shallowWithIntl(<ActionCard key={'myKey'} child={card} />);
    const child = component.find(ElasticAgentCard);
    expect(child.length).toBe(1);
    expect(child.at(0).props().onClick).toBe(onClick);
    expect(child.at(0).props().button).toBe('Elastic agent button');
  });
});

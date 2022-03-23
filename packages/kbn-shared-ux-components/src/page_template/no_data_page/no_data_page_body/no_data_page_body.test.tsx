/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NoDataPageBody } from './no_data_page_body';
import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ElasticAgentCard } from '../no_data_card';

describe('NoDataPageBody', () => {
  const action = {
    button: 'Button text',
    onClick: jest.fn(),
  };
  const el = <ElasticAgentCard key={'ElasticAgentCard'} {...action} />;
  const actionCard = <div key={'action'}>{el}</div>;
  test('render', () => {
    const component = shallowWithIntl(
      <NoDataPageBody solution="Elastic" docsLink="test" actionCard={actionCard} logo={'elastic'} />
    );
    expect(component).toMatchSnapshot();
  });
});

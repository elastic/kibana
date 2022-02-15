/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NoDataPageBody } from './no_data_page_body';
import React, { ReactElement } from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { NoDataCard } from '../no_data_card';

describe('NoDataPageBody', () => {
  const action = {
    recommended: false,
    button: 'Button text',
    onClick: jest.fn(),
  };
  const el = <NoDataCard key={'key'} {...action} />;
  const actionCards: ReactElement[] = [];
  actionCards.push(<div key={'action'}>{el}</div>);
  test('render', () => {
    const component = shallowWithIntl(
      <NoDataPageBody
        solution="Elastic"
        docsLink="test"
        actionCards={actionCards}
        logo={'elastic'}
      />
    );
    expect(component).toMatchSnapshot();
  });
});

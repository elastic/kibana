/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { NoDataPage } from './no_data_page';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ElasticAgentCard } from './no_data_card';

describe('NoDataPage', () => {
  test('render', () => {
    const component = shallowWithIntl(
      <NoDataPage
        solution="Analytics"
        action={{
          elasticAgent: {},
        }}
        logo={'logoKibana'}
        docsLink="test"
      />
    );
    expect(component).toMatchSnapshot();
    expect(component.find('h1').html()).toContain('Welcome to Elastic Analytics!');
    expect(component.find(ElasticAgentCard).length).toBe(1);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { KibanaPageTemplate } from './page_template';
import { EuiEmptyPrompt } from '@elastic/eui';

describe('KibanaPageTemplate', () => {
  test('render default empty prompt', () => {
    const component = shallow(
      <KibanaPageTemplate
        isEmptyState={true}
        pageHeader={{
          iconType: 'test',
          title: 'test',
          description: 'test',
          rightSideItems: ['test'],
        }}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('render custom empty prompt only', () => {
    const component = shallow(
      <KibanaPageTemplate isEmptyState={true}>
        <EuiEmptyPrompt title={<h1>custom test</h1>} />
      </KibanaPageTemplate>
    );
    expect(component).toMatchSnapshot();
  });

  test('render custom empty prompt with page header', () => {
    const component = shallow(
      <KibanaPageTemplate
        isEmptyState={true}
        pageHeader={{
          iconType: 'test',
          title: 'test',
          description: 'test',
          rightSideItems: ['test'],
        }}
      >
        <EuiEmptyPrompt title={<h1>custom test</h1>} />
      </KibanaPageTemplate>
    );
    expect(component).toMatchSnapshot();
  });

  test('render basic template', () => {
    const component = shallow(
      <KibanaPageTemplate
        pageHeader={{
          iconType: 'test',
          title: 'test',
          description: 'test',
          rightSideItems: ['test'],
        }}
      />
    );
    expect(component).toMatchSnapshot();
  });
});

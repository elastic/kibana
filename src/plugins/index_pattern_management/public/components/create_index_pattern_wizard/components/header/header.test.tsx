/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { Header } from '../header';
import { mount } from 'enzyme';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { mockManagementPlugin } from '../../../../mocks';
import { DocLinksStart } from 'kibana/public';

describe('Header', () => {
  const indexPatternName = 'test index pattern';
  const mockedContext = mockManagementPlugin.createIndexPatternManagmentContext();
  const mockedDocLinks = {
    links: {
      indexPatterns: {},
    },
  } as DocLinksStart;

  it('should render normally', () => {
    const component = mount(
      <Header indexPatternName={indexPatternName} docLinks={mockedDocLinks} />,
      {
        wrappingComponent: KibanaContextProvider,
        wrappingComponentProps: {
          services: mockedContext,
        },
      }
    );

    expect(component).toMatchSnapshot();
  });

  it('should render without including system indices', () => {
    const component = mount(
      <Header indexPatternName={indexPatternName} docLinks={mockedDocLinks} />,
      {
        wrappingComponent: KibanaContextProvider,
        wrappingComponentProps: {
          services: mockedContext,
        },
      }
    );

    expect(component).toMatchSnapshot();
  });

  it('should render a different name, prompt, and beta tag if provided', () => {
    const component = mount(
      <Header
        prompt={<div>Test prompt</div>}
        indexPatternName={indexPatternName}
        isBeta={true}
        docLinks={mockedDocLinks}
      />,
      {
        wrappingComponent: KibanaContextProvider,
        wrappingComponentProps: {
          services: mockedContext,
        },
      }
    );

    expect(component).toMatchSnapshot();
  });
});

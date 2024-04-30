/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// imports from npm packages
import React from 'react';
import { shallow } from 'enzyme';

// imports from immediate files
import { KibanaPageTemplateInner } from './page_template_inner';

describe('KibanaPageTemplateInner', () => {
  const pageHeader = {
    iconType: 'test',
    pageTitle: 'test',
    description: 'test',
    rightSideItems: ['test'],
  };

  describe('isEmpty', () => {
    test('pageHeader & children', () => {
      const component = shallow(
        <KibanaPageTemplateInner
          isEmptyState={true}
          pageHeader={pageHeader}
          children={<div data-test-subj={'child'}>Child element</div>}
        />
      );
      expect(component).toMatchSnapshot();
      expect(component.find('[data-test-subj="child"]').length).toBe(1);
    });

    test('pageHeader & no children', () => {
      const component = shallow(
        <KibanaPageTemplateInner isEmptyState={true} pageHeader={pageHeader} />
      );
      expect(component).toMatchSnapshot();
      expect(component.find('_EuiPageEmptyPrompt').length).toBe(1);
    });

    test('no pageHeader', () => {
      const component = shallow(
        <KibanaPageTemplateInner isEmptyState={true} pageHeader={undefined} />
      );
      expect(component).toMatchSnapshot();
    });

    test('no pageHeader, isEmptyState, emptyPageBody', () => {
      const component = shallow(
        <KibanaPageTemplateInner
          isEmptyState={true}
          pageHeader={undefined}
          emptyPageBody={<div>{'custom empty page body'}</div>}
        />
      );
      expect(component).toMatchSnapshot();
    });
  });

  test('page sidebar', () => {
    const component = shallow(<KibanaPageTemplateInner pageSideBar={<>Test</>} />);
    expect(component).toMatchSnapshot();
    expect(component.find('EuiPageSidebar')).toHaveLength(1);
  });
});

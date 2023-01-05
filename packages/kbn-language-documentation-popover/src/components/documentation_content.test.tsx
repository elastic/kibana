/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl, findTestSubject } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { LanguageDocumentationPopoverContent } from './documentation_content';

describe('###Documentation popover content', () => {
  const sections = {
    groups: [
      {
        label: 'Section one',
        description: 'Section 1 description',
        items: [],
      },
      {
        label: 'Section two',
        items: [
          {
            label: 'Section two item 1',
            description: <span>Section 2 item 1 description</span>,
          },
          {
            label: 'Section two item 2',
            description: <span>Section 2 item 2 description</span>,
          },
        ],
      },
    ],
    initialSection: <span>Here is the initial section</span>,
  };
  test('Documentation component has a header element referring to the language given', () => {
    const component = mountWithIntl(<LanguageDocumentationPopoverContent language="test" />);
    const title = findTestSubject(component, 'language-documentation-title');
    expect(title.text()).toEqual('test reference');
  });

  test('Documentation component has a sidebar navigation list with all the section labels', () => {
    const component = mountWithIntl(
      <LanguageDocumentationPopoverContent language="test" sections={sections} />
    );
    const sectionsLabels = findTestSubject(component, 'language-documentation-navigation-title');
    expect(sectionsLabels.length).toBe(2);
    sectionsLabels.forEach((label, index) => {
      expect(label.text()).toEqual(sections.groups[index].label);
    });
  });

  test('Documentation component should list all sections that match the search input', () => {
    const component = mountWithIntl(
      <LanguageDocumentationPopoverContent language="test" sections={sections} />
    );
    const searchBox = component.find('[data-test-subj="language-documentation-navigation-search"]');
    act(() => {
      searchBox.at(0).prop('onChange')!({
        target: { value: 'one' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    component.update();

    const sectionsLabels = findTestSubject(component, 'language-documentation-navigation-title');
    expect(sectionsLabels.length).toBe(1);
    expect(sectionsLabels.text()).toEqual('Section one');
  });
});

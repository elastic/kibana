/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { QueryLanguageSwitcher, QueryLanguageSwitcherProps } from './language_switcher';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiButtonEmpty, EuiIcon, EuiPopover } from '@elastic/eui';
const startMock = coreMock.createStart();

describe('LanguageSwitcher', () => {
  function wrapInContext(testProps: QueryLanguageSwitcherProps) {
    const services = {
      uiSettings: startMock.uiSettings,
      docLinks: startMock.docLinks,
    };

    return (
      <KibanaContextProvider services={services}>
        <QueryLanguageSwitcher {...testProps} />
      </KibanaContextProvider>
    );
  }

  it('should toggle off if language is lucene', () => {
    const component = mountWithIntl(
      wrapInContext({
        language: 'lucene',
        onSelectLanguage: () => {
          return;
        },
      })
    );
    component.find(EuiButtonEmpty).simulate('click');
    expect(component.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(component.find('[data-test-subj="languageToggle"]').get(0).props.checked).toBeFalsy();
  });

  it('should toggle on if language is kuery', () => {
    const component = mountWithIntl(
      wrapInContext({
        language: 'kuery',
        onSelectLanguage: () => {
          return;
        },
      })
    );
    component.find(EuiButtonEmpty).simulate('click');
    expect(component.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(component.find('[data-test-subj="languageToggle"]').get(0).props.checked).toBeTruthy();
  });

  it('should toggle off if language is text', () => {
    const component = mountWithIntl(
      wrapInContext({
        language: 'text',
        onSelectLanguage: () => {
          return;
        },
      })
    );
    component.find(EuiButtonEmpty).simulate('click');
    expect(component.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(component.find('[data-test-subj="languageToggle"]').get(0).props.checked).toBeFalsy();
  });
  it('it set language on nonKql mode text', () => {
    const onSelectLanguage = jest.fn();

    const component = mountWithIntl(
      wrapInContext({
        language: 'kuery',
        nonKqlMode: 'text',
        onSelectLanguage,
      })
    );
    component.find(EuiButtonEmpty).simulate('click');
    expect(component.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(component.find('[data-test-subj="languageToggle"]').get(0).props.checked).toBeTruthy();

    component.find('[data-test-subj="languageToggle"]').at(1).simulate('click');

    expect(onSelectLanguage).toHaveBeenCalledWith('text');
  });
  it('it set language on nonKql mode lucene', () => {
    const onSelectLanguage = jest.fn();

    const component = mountWithIntl(
      wrapInContext({
        language: 'kuery',
        nonKqlMode: 'lucene',
        onSelectLanguage,
      })
    );
    component.find(EuiButtonEmpty).simulate('click');
    component.find('[data-test-subj="languageToggle"]').at(1).simulate('click');

    expect(onSelectLanguage).toHaveBeenCalledWith('lucene');
  });

  it('it set language on kuery mode with nonKqlMode text', () => {
    const onSelectLanguage = jest.fn();

    const component = mountWithIntl(
      wrapInContext({
        language: 'text',
        nonKqlMode: 'text',
        onSelectLanguage,
      })
    );

    expect(component.find(EuiIcon).prop('type')).toBe('boxesVertical');

    component.find(EuiButtonEmpty).simulate('click');
    component.find('[data-test-subj="languageToggle"]').at(1).simulate('click');

    expect(onSelectLanguage).toHaveBeenCalledWith('kuery');
  });

  it('it set language on kuery mode with nonKqlMode lucene', () => {
    const onSelectLanguage = jest.fn();

    const component = mountWithIntl(
      wrapInContext({
        language: 'lucene',
        nonKqlMode: 'lucene',
        onSelectLanguage,
      })
    );

    expect(component.find('[data-test-subj="switchQueryLanguageButton"]').at(0).text()).toBe(
      'Lucene'
    );

    component.find(EuiButtonEmpty).simulate('click');
    component.find('[data-test-subj="languageToggle"]').at(1).simulate('click');

    expect(onSelectLanguage).toHaveBeenCalledWith('kuery');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { QueryLanguageSwitcher, QueryLanguageSwitcherProps } from './language_switcher';
import { KibanaContextProvider } from '../../../kibana_react/public';
import { coreMock } from '../../../../core/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiButtonIcon, EuiIcon, EuiPopover } from '@elastic/eui';
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

  it('should select the lucene context menu if language is lucene', () => {
    const component = mountWithIntl(
      wrapInContext({
        language: 'lucene',
        onSelectLanguage: () => {
          return;
        },
      })
    );
    component.find(EuiButtonIcon).simulate('click');
    expect(component.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(component.find('[data-test-subj="luceneLanguageMenuItem"]').get(0).props.icon).toBe(
      'check'
    );
  });

  it('should select the kql context menu if language is kuery', () => {
    const component = mountWithIntl(
      wrapInContext({
        language: 'kuery',
        onSelectLanguage: () => {
          return;
        },
      })
    );
    component.find(EuiButtonIcon).simulate('click');
    expect(component.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(component.find('[data-test-subj="kqlLanguageMenuItem"]').get(0).props.icon).toBe(
      'check'
    );
  });

  it('should select the lucene context menu if language is text', () => {
    const component = mountWithIntl(
      wrapInContext({
        language: 'text',
        onSelectLanguage: () => {
          return;
        },
      })
    );
    component.find(EuiButtonIcon).simulate('click');
    expect(component.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(component.find('[data-test-subj="luceneLanguageMenuItem"]').get(0).props.icon).toBe(
      'check'
    );
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
    component.find(EuiButtonIcon).simulate('click');
    expect(component.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(component.find('[data-test-subj="kqlLanguageMenuItem"]').get(0).props.icon).toBe(
      'check'
    );

    component.find('[data-test-subj="luceneLanguageMenuItem"]').at(1).simulate('click');

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
    component.find(EuiButtonIcon).simulate('click');
    component.find('[data-test-subj="luceneLanguageMenuItem"]').at(1).simulate('click');

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

    expect(component.find(EuiIcon).prop('type')).toBe('filter');

    component.find(EuiButtonIcon).simulate('click');
    component.find('[data-test-subj="kqlLanguageMenuItem"]').at(1).simulate('click');

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
    component.find(EuiButtonIcon).simulate('click');
    expect(component.find('[data-test-subj="luceneLanguageMenuItem"]').get(0).props.icon).toBe(
      'check'
    );

    component.find('[data-test-subj="kqlLanguageMenuItem"]').at(1).simulate('click');

    expect(onSelectLanguage).toHaveBeenCalledWith('kuery');
  });
});

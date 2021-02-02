/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { QueryLanguageSwitcher } from './language_switcher';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { coreMock } from '../../../../../core/public/mocks';
import { mountWithIntl } from '@kbn/test/jest';
import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
const startMock = coreMock.createStart();

describe('LanguageSwitcher', () => {
  function wrapInContext(testProps: any) {
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
});

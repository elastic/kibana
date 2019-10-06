/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { QueryLanguageSwitcher } from './language_switcher';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { coreMock } from '../../../../../../../core/public/mocks';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
const startMock = coreMock.createStart();

jest.mock('@elastic/eui', () => {
  // This simplifies rendering and decouples interaction testing from EUI implementation
  const MockUiComponent = (props: any) => {
    return props.children || null;
  };
  const MockButtonComponent = (props: any) => {
    const { children, onChange } = props;
    return <button onClick={onChange}>{children}</button>;
  };

  return {
    EuiButtonEmpty: MockUiComponent,
    EuiForm: MockUiComponent,
    EuiFormRow: MockUiComponent,
    EuiLink: MockButtonComponent,
    EuiPopover: MockUiComponent,
    EuiPopoverTitle: MockUiComponent,
    EuiSpacer: MockUiComponent,
    EuiSwitch: MockButtonComponent,
    EuiText: MockUiComponent,
    PopoverAnchorPosition: MockUiComponent,
  };
});

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

    expect(component).toMatchSnapshot();
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

    expect(component).toMatchSnapshot();
  });

  it('call onSelectLanguage when the toggle is clicked', () => {
    const callback = jest.fn();
    const component = mountWithIntl(
      wrapInContext({
        language: 'kuery',
        onSelectLanguage: callback,
      })
    );

    component.find('[data-test-subj="languageToggle"]').simulate('click');
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

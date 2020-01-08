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
import { shallowWithI18nProvider } from 'test_utils/enzyme_helpers';

import { ScriptedFieldsTable } from '../scripted_fields_table';

jest.mock('@elastic/eui', () => ({
  EuiTitle: 'eui-title',
  EuiText: 'eui-text',
  EuiHorizontalRule: 'eui-horizontal-rule',
  EuiSpacer: 'eui-spacer',
  EuiCallOut: 'eui-call-out',
  EuiLink: 'eui-link',
  EuiOverlayMask: 'eui-overlay-mask',
  EuiConfirmModal: 'eui-confirm-modal',
  Comparators: {
    property: () => {},
    default: () => {},
  },
}));
jest.mock('../components/header', () => ({ Header: 'header' }));
jest.mock('../components/call_outs', () => ({ CallOuts: 'call-outs' }));
jest.mock('../components/table', () => ({
  // Note: this seems to fix React complaining about non lowercase attributes
  Table: () => {
    return 'table';
  },
}));
jest.mock('ui/scripting_languages', () => ({
  getSupportedScriptingLanguages: () => ['painless'],
  getDeprecatedScriptingLanguages: () => [],
}));
jest.mock('ui/documentation_links', () => ({
  documentationLinks: {
    scriptedFields: {
      painless: 'painlessDocs',
    },
  },
}));

const helpers = {
  redirectToRoute: () => {},
  getRouteHref: () => '#',
};

const indexPattern = {
  getScriptedFields: () => [
    { name: 'ScriptedField', lang: 'painless', script: 'x++' },
    { name: 'JustATest', lang: 'painless', script: 'z++' },
  ],
};

describe('ScriptedFieldsTable', () => {
  it('should render normally', async () => {
    const component = shallowWithI18nProvider(
      <ScriptedFieldsTable indexPattern={indexPattern} helpers={helpers} />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    expect(component).toMatchSnapshot();
  });

  it('should filter based on the query bar', async () => {
    const component = shallowWithI18nProvider(
      <ScriptedFieldsTable indexPattern={indexPattern} helpers={helpers} />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    component.setProps({ fieldFilter: 'Just' });
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should filter based on the lang filter', async () => {
    const component = shallowWithI18nProvider(
      <ScriptedFieldsTable
        indexPattern={{
          getScriptedFields: () => [
            { name: 'ScriptedField', lang: 'painless', script: 'x++' },
            { name: 'JustATest', lang: 'painless', script: 'z++' },
            { name: 'Bad', lang: 'somethingElse', script: 'z++' },
          ],
        }}
        helpers={helpers}
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    component.setProps({ scriptedFieldLanguageFilter: 'painless' });
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should hide the table if there are no scripted fields', async () => {
    const component = shallowWithI18nProvider(
      <ScriptedFieldsTable
        indexPattern={{
          getScriptedFields: () => [],
        }}
        helpers={helpers}
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    expect(component).toMatchSnapshot();
  });

  it('should show a delete modal', async () => {
    const component = shallowWithI18nProvider(
      <ScriptedFieldsTable indexPattern={indexPattern} helpers={helpers} />
    );

    await component.update(); // Fire `componentWillMount()`
    component.instance().startDeleteField({ name: 'ScriptedField' });
    await component.update();

    // Ensure the modal is visible
    expect(component).toMatchSnapshot();
  });

  it('should delete a field', async () => {
    const removeScriptedField = jest.fn();
    const component = shallowWithI18nProvider(
      <ScriptedFieldsTable
        indexPattern={{
          ...indexPattern,
          removeScriptedField,
        }}
        helpers={helpers}
      />
    );

    await component.update(); // Fire `componentWillMount()`
    component.instance().startDeleteField({ name: 'ScriptedField' });
    await component.update();
    await component.instance().deleteField();
    await component.update();
    expect(removeScriptedField).toBeCalled();
  });
});

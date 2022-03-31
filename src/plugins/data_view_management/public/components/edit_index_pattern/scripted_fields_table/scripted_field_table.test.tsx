/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';

import { ScriptedFieldsTable } from '../scripted_fields_table';
import { DataView } from '../../../../../../plugins/data_views/public';

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
jest.mock('./components/header', () => ({ Header: 'header' }));
jest.mock('./components/call_outs', () => ({ CallOuts: 'call-outs' }));
jest.mock('./components/table', () => ({
  // Note: this seems to fix React complaining about non lowercase attributes
  Table: () => {
    return 'table';
  },
}));

const helpers = {
  redirectToRoute: () => {},
  getRouteHref: () => '#',
};

const getIndexPatternMock = (mockedFields: any = {}) => ({ ...mockedFields } as DataView);

describe('ScriptedFieldsTable', () => {
  let indexPattern: DataView;

  beforeEach(() => {
    indexPattern = getIndexPatternMock({
      getScriptedFields: () => [
        { isUserEditable: true, name: 'ScriptedField', lang: 'painless', script: 'x++' },
        {
          isUserEditable: false,
          name: 'JustATest',
          lang: 'painless',
          script: 'z++',
        },
      ],
    }) as DataView;
  });

  test('should render normally', async () => {
    const component: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>> = shallow<
      typeof ScriptedFieldsTable
    >(
      <ScriptedFieldsTable
        indexPattern={indexPattern}
        helpers={helpers}
        painlessDocLink={'painlessDoc'}
        saveIndexPattern={async () => {}}
        userEditPermission={false}
        scriptedFieldLanguageFilter={[]}
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    expect(component).toMatchSnapshot();
  });

  test('should filter based on the query bar', async () => {
    const component: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>> = shallow(
      <ScriptedFieldsTable
        indexPattern={indexPattern}
        helpers={helpers}
        painlessDocLink={'painlessDoc'}
        saveIndexPattern={async () => {}}
        userEditPermission={false}
        scriptedFieldLanguageFilter={[]}
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    component.setProps({ fieldFilter: 'Just' });
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should filter based on the lang filter', async () => {
    const component: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>> = shallow<
      typeof ScriptedFieldsTable
    >(
      <ScriptedFieldsTable
        indexPattern={
          getIndexPatternMock({
            getScriptedFields: () => [
              { isUserEditable: true, name: 'ScriptedField', lang: 'painless', script: 'x++' },
              { isUserEditable: true, name: 'JustATest', lang: 'painless', script: 'z++' },
              { isUserEditable: true, name: 'Bad', lang: 'somethingElse', script: 'z++' },
            ],
          }) as DataView
        }
        painlessDocLink={'painlessDoc'}
        helpers={helpers}
        saveIndexPattern={async () => {}}
        userEditPermission={false}
        scriptedFieldLanguageFilter={[]}
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    component.setProps({ scriptedFieldLanguageFilter: ['painless'] });
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should hide the table if there are no scripted fields', async () => {
    const component: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>> = shallow(
      <ScriptedFieldsTable
        indexPattern={
          getIndexPatternMock({
            getScriptedFields: () => [],
          }) as DataView
        }
        painlessDocLink={'painlessDoc'}
        helpers={helpers}
        saveIndexPattern={async () => {}}
        userEditPermission={false}
        scriptedFieldLanguageFilter={[]}
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    expect(component).toMatchSnapshot();
  });

  test('should show a delete modal', async () => {
    const component: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>> = shallow<
      typeof ScriptedFieldsTable
    >(
      <ScriptedFieldsTable
        indexPattern={indexPattern}
        helpers={helpers}
        painlessDocLink={'painlessDoc'}
        saveIndexPattern={async () => {}}
        userEditPermission={false}
        scriptedFieldLanguageFilter={[]}
      />
    );

    await component.update(); // Fire `componentWillMount()`
    // @ts-expect-error lang is not valid
    component.instance().startDeleteField({ name: 'ScriptedField', lang: '', script: '' });
    await component.update();

    // Ensure the modal is visible
    expect(component).toMatchSnapshot();
  });

  test('should delete a field', async () => {
    const removeScriptedField = jest.fn();
    const component: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>> = shallow<
      typeof ScriptedFieldsTable
    >(
      <ScriptedFieldsTable
        indexPattern={
          {
            ...indexPattern,
            removeScriptedField,
          } as unknown as DataView
        }
        helpers={helpers}
        painlessDocLink={'painlessDoc'}
        saveIndexPattern={async () => {}}
        userEditPermission={false}
        scriptedFieldLanguageFilter={[]}
      />
    );

    await component.update(); // Fire `componentWillMount()`
    // @ts-expect-error
    component.instance().startDeleteField({ name: 'ScriptedField', lang: '', script: '' });

    await component.update();
    // @ts-expect-error
    await component.instance().deleteField();
    await component.update();

    expect(removeScriptedField).toBeCalled();
  });
});

import React from 'react';
import { shallow } from 'enzyme';

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
  }
}));
jest.mock('ui/scripting_languages', () => ({
  getSupportedScriptingLanguages: () => ['painless'],
  getDeprecatedScriptingLanguages: () => [],
}));
jest.mock('ui/documentation_links', () => ({
  documentationLinks: {
    scriptedFields: {
      painless: 'painlessDocs'
    }
  }
}));

const helpers = {
  redirectToRoute: () => {},
  getRouteHref: () => '#',
};

const indexPattern = {
  getScriptedFields: () => ([
    { name: 'ScriptedField', lang: 'painless', script: 'x++' },
    { name: 'JustATest', lang: 'painless', script: 'z++' },
  ])
};

describe('ScriptedFieldsTable', () => {
  it('should render normally', async () => {
    const component = shallow(
      <ScriptedFieldsTable
        indexPattern={indexPattern}
        helpers={helpers}
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    expect(component).toMatchSnapshot();
  });

  it('should filter based on the query bar', async () => {
    const component = shallow(
      <ScriptedFieldsTable
        indexPattern={indexPattern}
        helpers={helpers}
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

  it('should filter based on the lang filter', async () => {
    const component = shallow(
      <ScriptedFieldsTable
        indexPattern={{
          getScriptedFields: () => ([
            { name: 'ScriptedField', lang: 'painless', script: 'x++' },
            { name: 'JustATest', lang: 'painless', script: 'z++' },
            { name: 'Bad', lang: 'somethingElse', script: 'z++' },
          ])
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
    const component = shallow(
      <ScriptedFieldsTable
        indexPattern={{
          getScriptedFields: () => ([])
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
    const component = shallow(
      <ScriptedFieldsTable
        indexPattern={indexPattern}
        helpers={helpers}
      />
    );

    await component.update(); // Fire `componentWillMount()`
    component.instance().startDeleteField({ name: 'ScriptedField' });
    await component.update();

    // Ensure the modal is visible
    expect(component).toMatchSnapshot();
  });

  it('should delete a field', async () => {
    const removeScriptedField = jest.fn();
    const component = shallow(
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

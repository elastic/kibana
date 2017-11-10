import React from 'react';
import sinon from 'sinon';
import { mount, shallow } from 'enzyme';

import {
  ControlsTab,
} from './controls_tab';

const savedObjectsClientMock = {
  find: () => {
    return Promise.resolve({
      savedObjects: [
        {
          id: 'indexPattern1',
          attributes: {
            title: 'title1'
          }
        }
      ]
    });
  }
};
const indexPatternsMock = {
  get: () => {
    return Promise.resolve({
      fields: [
        { name: 'keywordField', type: 'string', aggregatable: true },
        { name: 'numberField', type: 'number', aggregatable: true }
      ]
    });
  }
};
const scopeMock = {
  vis: {
    API: {
      savedObjectsClient: savedObjectsClientMock,
      indexPatterns: indexPatternsMock
    },
    params: {
      'controls': [
        {
          'id': '1',
          'indexPattern': 'indexPattern1',
          'fieldName': 'keywordField',
          'label': 'custom label',
          'type': 'list',
          'options': {
            'type': 'terms',
            'multiselect': true,
            'size': 5,
            'order': 'desc'
          }
        },
        {
          'id': '2',
          'indexPattern': 'indexPattern1',
          'fieldName': 'numberField',
          'label': '',
          'type': 'range',
          'options': {
            'step': 1
          }
        }
      ]
    }
  }
};
let stageEditorParams;

beforeEach(() => {
  stageEditorParams = sinon.spy();
});

test('renders ControlsTab', () => {
  const component = shallow(<ControlsTab
    scope={scopeMock}
    stageEditorParams={stageEditorParams}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('add control btn', () => {
  const component = mount(<ControlsTab
    scope={scopeMock}
    stageEditorParams={stageEditorParams}
  />);
  component.find('[data-test-subj="inputControlEditorAddBtn"]').simulate('click');
  // Use custom match function since control.id is dynamically generated and never the same.
  sinon.assert.calledWith(stageEditorParams, sinon.match((newParams) => {
    if (newParams.controls.length !== 3) {
      return false;
    }
    return true;
  }, 'control not added to vis.params'));
});

test('remove control btn', () => {
  const component = mount(<ControlsTab
    scope={scopeMock}
    stageEditorParams={stageEditorParams}
  />);
  component.find('[data-test-subj="inputControlEditorRemoveControl0"]').simulate('click');
  const expectedParams = {
    'controls': [
      {
        'id': '2',
        'indexPattern': 'indexPattern1',
        'fieldName': 'numberField',
        'label': '',
        'type': 'range',
        'options': {
          'step': 1
        }
      }
    ]
  };
  sinon.assert.calledWith(stageEditorParams, sinon.match(expectedParams));
});


test('move down control btn', () => {
  const component = mount(<ControlsTab
    scope={scopeMock}
    stageEditorParams={stageEditorParams}
  />);
  component.find('[data-test-subj="inputControlEditorMoveDownControl0"]').simulate('click');
  const expectedParams = {
    'controls': [
      {
        'id': '2',
        'indexPattern': 'indexPattern1',
        'fieldName': 'numberField',
        'label': '',
        'type': 'range',
        'options': {
          'step': 1
        }
      },
      {
        'id': '1',
        'indexPattern': 'indexPattern1',
        'fieldName': 'keywordField',
        'label': 'custom label',
        'type': 'list',
        'options': {
          'type': 'terms',
          'multiselect': true,
          'size': 5,
          'order': 'desc'
        }
      }
    ]
  };
  sinon.assert.calledWith(stageEditorParams, sinon.match(expectedParams));
});

test('move up control btn', () => {
  const component = mount(<ControlsTab
    scope={scopeMock}
    stageEditorParams={stageEditorParams}
  />);
  component.find('[data-test-subj="inputControlEditorMoveUpControl1"]').simulate('click');
  const expectedParams = {
    'controls': [
      {
        'id': '2',
        'indexPattern': 'indexPattern1',
        'fieldName': 'numberField',
        'label': '',
        'type': 'range',
        'options': {
          'step': 1
        }
      },
      {
        'id': '1',
        'indexPattern': 'indexPattern1',
        'fieldName': 'keywordField',
        'label': 'custom label',
        'type': 'list',
        'options': {
          'type': 'terms',
          'multiselect': true,
          'size': 5,
          'order': 'desc'
        }
      }
    ]
  };
  sinon.assert.calledWith(stageEditorParams, sinon.match(expectedParams));
});

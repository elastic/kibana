import React from 'react';
import sinon from 'sinon';
import { mount, shallow } from 'enzyme';
import {
  findTestSubject,
} from '@elastic/eui/lib/test';

import {
  DashboardAddPanel,
} from './add_panel';

jest.mock('ui/notify',
  () => ({
    toastNotifications: {
      addDanger: () => {},
    }
  }), { virtual: true });

let onClose;
beforeEach(() => {
  onClose = sinon.spy();
});

test('render', () => {
  const component = shallow(<DashboardAddPanel
    onClose={onClose}
    find={() => {}}
    addNewPanel={() => {}}
    addNewVis={() => {}}
  />);
  expect(component).toMatchSnapshot();
});

test('onClose', () => {
  const component = mount(<DashboardAddPanel
    onClose={onClose}
    find={() => {}}
    addNewPanel={() => {}}
    addNewVis={() => {}}
  />);
  findTestSubject(component, 'closeAddPanelBtn', false).simulate('click');
  sinon.assert.calledOnce(onClose);
});

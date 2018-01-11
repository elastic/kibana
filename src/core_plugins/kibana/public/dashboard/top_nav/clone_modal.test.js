import React from 'react';
import sinon from 'sinon';
import { mount, shallow } from 'enzyme';
import {
  findTestSubject,
} from '@elastic/eui/lib/test';

import {
  DashboardCloneModal,
} from '../top_nav/clone_modal';

let onClone;
let onClose;
let component;

beforeEach(() => {
  onClone = sinon.spy();
  onClose = sinon.spy();
});

function createComponent(creationMethod = mount) {
  component = creationMethod(
    <DashboardCloneModal
      title="dash title"
      onClose={onClose}
      onClone={onClone}
    />
  );
}

test('renders DashboardCloneModal', () => {
  createComponent(shallow);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('onClone', () => {
  createComponent();
  findTestSubject(component, 'cloneConfirmButton', false).simulate('click');
  sinon.assert.calledWith(onClone, 'dash title');
  sinon.assert.notCalled(onClose);
});

test('onClose', () => {
  createComponent();
  findTestSubject(component, 'cloneCancelButton', false).simulate('click');
  sinon.assert.calledOnce(onClose);
  sinon.assert.notCalled(onClone);
});

test('title', () => {
  createComponent();
  const event = { target: { value: 'a' } };
  component.find('input').simulate('change', event);
  findTestSubject(component, 'cloneConfirmButton', false).simulate('click');
  sinon.assert.calledWith(onClone, 'a');
});

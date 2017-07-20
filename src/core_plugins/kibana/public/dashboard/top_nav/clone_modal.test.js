import React from 'react';
import sinon from 'sinon';
import { mount, render } from 'enzyme';

import {
  DashboardCloneModal,
} from '../top_nav/clone_modal';

let onClone;
let onClose;

beforeEach(() => {
  onClone = sinon.spy();
  onClose = sinon.spy();
});

test('renders DashboardCloneModal', () => {
  const component = render(<DashboardCloneModal
    title="dash title"
    onClose={onClose}
    onClone={onClone}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('onClone', () => {
  const component = mount(<DashboardCloneModal
    title="dash title"
    onClose={onClose}
    onClone={onClone}
  />);
  component.find('[data-test-subj="cloneConfirmButton"]').simulate('click');
  sinon.assert.calledWith(onClone, 'dash title');
  sinon.assert.notCalled(onClose);
});

test('onClose', () => {
  const component = mount(<DashboardCloneModal
    title="dash title"
    onClose={onClose}
    onClone={onClone}
  />);
  component.find('[data-test-subj="cloneCancelButton"]').simulate('click');
  sinon.assert.calledOnce(onClose);
  sinon.assert.notCalled(onClone);
});

test('title', () => {
  const component = mount(<DashboardCloneModal
    title="dash title"
    onClose={onClose}
    onClone={onClone}
  />);
  const event = { target: { value: 'a' } };
  component.find('input').simulate('change', event);
  component.find('[data-test-subj="cloneConfirmButton"]').simulate('click');
  sinon.assert.calledWith(onClone, 'a');
});

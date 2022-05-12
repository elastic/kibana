/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import sinon from 'sinon';
import { shallowWithI18nProvider, mountWithI18nProvider } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';

import { DashboardCloneModal } from './clone_modal';

let onClone;
let onClose;

beforeEach(() => {
  onClone = sinon.spy();
  onClose = sinon.spy();
});

test('renders DashboardCloneModal', () => {
  const component = shallowWithI18nProvider(
    <DashboardCloneModal title="dash title" onClose={onClose} onClone={onClone} />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('onClone', () => {
  const component = mountWithI18nProvider(
    <DashboardCloneModal title="dash title" onClose={onClose} onClone={onClone} />
  );
  findTestSubject(component, 'cloneConfirmButton').simulate('click');
  sinon.assert.calledWith(onClone, 'dash title');
  sinon.assert.notCalled(onClose);
});

test('onClose', () => {
  const component = mountWithI18nProvider(
    <DashboardCloneModal title="dash title" onClose={onClose} onClone={onClone} />
  );
  findTestSubject(component, 'cloneCancelButton').simulate('click');
  sinon.assert.calledOnce(onClose);
  sinon.assert.notCalled(onClone);
});

test('title', () => {
  const component = mountWithI18nProvider(
    <DashboardCloneModal title="dash title" onClose={onClose} onClone={onClone} />
  );
  const event = { target: { value: 'a' } };
  component.find('input').simulate('change', event);
  findTestSubject(component, 'cloneConfirmButton').simulate('click');
  sinon.assert.calledWith(onClone, 'a');
});

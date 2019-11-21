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
import { expect } from 'chai';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import sinon from 'sinon';
import { AddDeleteButtons } from './add_delete_buttons';

describe('AddDeleteButtons', () => {
  it('calls onAdd={handleAdd}', () => {
    const handleAdd = sinon.spy();
    const wrapper = shallowWithIntl(<AddDeleteButtons onAdd={handleAdd} />);
    wrapper
      .find('EuiButtonIcon')
      .at(0)
      .simulate('click');
    expect(handleAdd.calledOnce).to.equal(true);
  });

  it('calls onDelete={handleDelete}', () => {
    const handleDelete = sinon.spy();
    const wrapper = shallowWithIntl(<AddDeleteButtons onDelete={handleDelete} />);
    wrapper
      .find('EuiButtonIcon')
      .at(1)
      .simulate('click');
    expect(handleDelete.calledOnce).to.equal(true);
  });

  it('calls onClone={handleClone}', () => {
    const handleClone = sinon.spy();
    const wrapper = shallowWithIntl(<AddDeleteButtons onClone={handleClone} />);
    wrapper
      .find('EuiButtonIcon')
      .at(0)
      .simulate('click');
    expect(handleClone.calledOnce).to.equal(true);
  });

  it('disableDelete={true}', () => {
    const wrapper = shallowWithIntl(<AddDeleteButtons disableDelete={true} />);
    expect(wrapper.find({ text: 'Delete' })).to.have.length(0);
  });

  it('disableAdd={true}', () => {
    const wrapper = shallowWithIntl(<AddDeleteButtons disableAdd={true} />);
    expect(wrapper.find({ text: 'Add' })).to.have.length(0);
  });

  it('should not display clone by default', () => {
    const wrapper = shallowWithIntl(<AddDeleteButtons />);
    expect(wrapper.find({ text: 'Clone' })).to.have.length(0);
  });

  it('should not display clone when disableAdd={true}', () => {
    const fn = sinon.spy();
    const wrapper = shallowWithIntl(<AddDeleteButtons onClone={fn} disableAdd={true} />);
    expect(wrapper.find({ text: 'Clone' })).to.have.length(0);
  });
});

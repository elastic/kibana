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
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { AddDeleteButtons } from './add_delete_buttons';

describe('AddDeleteButtons', () => {
  it('calls onAdd={handleAdd}', () => {
    const handleAdd = jest.fn();
    const wrapper = shallowWithIntl(<AddDeleteButtons onAdd={handleAdd} />);
    wrapper.find('EuiButtonIcon').at(0).simulate('click');
    expect(handleAdd).toHaveBeenCalled();
  });

  it('calls onDelete={handleDelete}', () => {
    const handleDelete = jest.fn();
    const wrapper = shallowWithIntl(<AddDeleteButtons onDelete={handleDelete} />);
    wrapper.find('EuiButtonIcon').at(1).simulate('click');
    expect(handleDelete).toHaveBeenCalled();
  });

  it('calls onClone={handleClone}', () => {
    const handleClone = jest.fn();
    const wrapper = shallowWithIntl(<AddDeleteButtons onClone={handleClone} />);
    wrapper.find('EuiButtonIcon').at(0).simulate('click');
    expect(handleClone).toHaveBeenCalled();
  });

  it('disableDelete={true}', () => {
    const wrapper = shallowWithIntl(<AddDeleteButtons disableDelete={true} />);
    expect(wrapper.find({ text: 'Delete' })).toHaveLength(0);
  });

  it('disableAdd={true}', () => {
    const wrapper = shallowWithIntl(<AddDeleteButtons disableAdd={true} />);
    expect(wrapper.find({ text: 'Add' })).toHaveLength(0);
  });

  it('should not display clone by default', () => {
    const wrapper = shallowWithIntl(<AddDeleteButtons />);
    expect(wrapper.find({ text: 'Clone' })).toHaveLength(0);
  });

  it('should not display clone when disableAdd={true}', () => {
    const fn = jest.fn();
    const wrapper = shallowWithIntl(<AddDeleteButtons onClone={fn} disableAdd={true} />);
    expect(wrapper.find({ text: 'Clone' })).toHaveLength(0);
  });
});

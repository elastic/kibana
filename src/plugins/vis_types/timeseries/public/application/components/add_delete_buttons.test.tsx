/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
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

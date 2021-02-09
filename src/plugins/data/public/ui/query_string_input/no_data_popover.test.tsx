/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl as mount } from '@kbn/test/jest';
import { NoDataPopover } from './no_data_popover';
import { EuiTourStep } from '@elastic/eui';
import { act } from 'react-dom/test-utils';

describe('NoDataPopover', () => {
  const createMockStorage = () => ({
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  });

  it('should hide popover if showNoDataPopover is set to false', () => {
    const Child = () => <span />;
    const instance = mount(
      <NoDataPopover storage={createMockStorage()} showNoDataPopover={false}>
        <Child />
      </NoDataPopover>
    );
    expect(instance.find(EuiTourStep).prop('isStepOpen')).toBe(false);
    expect(instance.find(EuiTourStep).find(Child)).toHaveLength(1);
  });

  it('should hide popover if showNoDataPopover is set to true, but local storage flag is set', () => {
    const child = <span />;
    const storage = createMockStorage();
    storage.get.mockReturnValue(true);
    const instance = mount(
      <NoDataPopover storage={storage} showNoDataPopover={false}>
        {child}
      </NoDataPopover>
    );
    expect(instance.find(EuiTourStep).prop('isStepOpen')).toBe(false);
  });

  it('should render popover if showNoDataPopover is set to true and local storage flag is not set', () => {
    const child = <span />;
    const instance = mount(
      <NoDataPopover storage={createMockStorage()} showNoDataPopover={true}>
        {child}
      </NoDataPopover>
    );
    expect(instance.find(EuiTourStep).prop('isStepOpen')).toBe(true);
  });

  it('should hide popover if it is closed', async () => {
    const props = {
      children: <span />,
      showNoDataPopover: true,
      storage: createMockStorage(),
    };
    const instance = mount(<NoDataPopover {...props} />);
    act(() => {
      instance.find(EuiTourStep).prop('closePopover')!();
    });
    instance.setProps({ ...props });
    expect(instance.find(EuiTourStep).prop('isStepOpen')).toBe(false);
  });

  it('should set local storage flag and hide on closing with button', () => {
    const props = {
      children: <span />,
      showNoDataPopover: true,
      storage: createMockStorage(),
    };
    const instance = mount(<NoDataPopover {...props} />);
    act(() => {
      instance.find(EuiTourStep).prop('footerAction')!.props.onClick();
    });
    instance.setProps({ ...props });
    expect(props.storage.set).toHaveBeenCalledWith(expect.any(String), true);
    expect(instance.find(EuiTourStep).prop('isStepOpen')).toBe(false);
  });
});

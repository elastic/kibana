/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { TopNavMenuItemProps } from './top_nav_menu_item';
import { TopNavMenuItem } from './top_nav_menu_item';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { EuiButtonIcon } from '@elastic/eui';

describe('TopNavMenu', () => {
  const ensureMenuItemDisabled = (data: TopNavMenuItemProps) => {
    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    expect(component.prop('isDisabled')).toEqual(true);

    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toHaveBeenCalledTimes(0);
  };

  it('Should render and click an item', () => {
    const data: TopNavMenuItemProps = {
      id: 'test',
      label: 'test',
      run: jest.fn(),
      closePopover: jest.fn(),
    };

    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    expect(component.prop('isDisabled')).toEqual(false);

    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toBeCalledTimes(1);
    expect(data.run).toHaveBeenCalledWith(event.currentTarget);

    component.simulate('click', event);
    expect(data.run).toBeCalledTimes(2);
  });

  it('Should render item with all attributes', () => {
    const data: TopNavMenuItemProps = {
      id: 'test',
      label: 'test',
      description: 'description',
      testId: 'test-class-name',
      disableButton: false,
      run: jest.fn(),
      closePopover: jest.fn(),
    };

    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    expect(component.prop('isDisabled')).toEqual(false);

    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toHaveBeenCalled();
  });

  it('Should render emphasized item which should be clickable', () => {
    const data: TopNavMenuItemProps = {
      id: 'test',
      label: 'test',
      iconType: 'beaker',
      iconSide: 'right',
      emphasize: true,
      run: jest.fn(),
      closePopover: jest.fn(),
    };

    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toHaveBeenCalledTimes(1);
    expect(component).toMatchSnapshot();
  });

  it('Should render an icon-only item', () => {
    const data: TopNavMenuItemProps = {
      id: 'test',
      label: 'test',
      iconType: 'share',
      iconOnly: true,
      run: jest.fn(),
      closePopover: jest.fn(),
    };

    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    expect(component).toMatchSnapshot();

    const event = { currentTarget: { value: 'a' } };
    component.find(EuiButtonIcon).simulate('click', event);
    expect(data.run).toHaveBeenCalledTimes(1);
  });

  it('Should render disabled item and it shouldnt be clickable', () => {
    ensureMenuItemDisabled({
      id: 'test',
      label: 'test',
      disableButton: true,
      run: jest.fn(),
      closePopover: jest.fn(),
    });
  });

  it('Should render item with disable function and it shouldnt be clickable', () => {
    ensureMenuItemDisabled({
      id: 'test',
      label: 'test',
      disableButton: () => true,
      run: jest.fn(),
      closePopover: jest.fn(),
    });
  });

  it('Should render disabled emphasized item which shouldnt be clickable', () => {
    ensureMenuItemDisabled({
      id: 'test',
      label: 'test',
      iconType: 'beaker',
      iconSide: 'right',
      emphasize: true,
      disableButton: true,
      run: jest.fn(),
      closePopover: jest.fn(),
    });
  });

  it('Should render emphasized item with disable function and it shouldnt be clickable', () => {
    ensureMenuItemDisabled({
      id: 'test',
      label: 'test',
      iconType: 'beaker',
      iconSide: 'right',
      emphasize: true,
      disableButton: () => true,
      run: jest.fn(),
      closePopover: jest.fn(),
    });
  });

  it('Should render emphasized item in mobile mode, which should be clickable and call closePopover on click', () => {
    const data: TopNavMenuItemProps = {
      id: 'test',
      label: 'test',
      iconType: 'beaker',
      iconSide: 'right',
      emphasize: true,
      isMobileMenu: true,
      run: jest.fn(),
      closePopover: jest.fn(),
    };

    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toHaveBeenCalledTimes(1);
    expect(data.closePopover).toHaveBeenCalledTimes(1);
  });
});

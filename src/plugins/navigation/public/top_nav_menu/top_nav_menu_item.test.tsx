/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { TopNavMenuItem } from './top_nav_menu_item';
import { TopNavMenuData } from './top_nav_menu_data';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

describe('TopNavMenu', () => {
  const ensureMenuItemDisabled = (data: TopNavMenuData) => {
    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    expect(component.prop('isDisabled')).toEqual(true);

    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toHaveBeenCalledTimes(0);
  };

  it('Should render and click an item', () => {
    const data: TopNavMenuData = {
      id: 'test',
      label: 'test',
      run: jest.fn(),
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
    const data: TopNavMenuData = {
      id: 'test',
      label: 'test',
      description: 'description',
      testId: 'test-class-name',
      disableButton: false,
      run: jest.fn(),
    };

    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    expect(component.prop('isDisabled')).toEqual(false);

    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toHaveBeenCalled();
  });

  it('Should render emphasized item which should be clickable', () => {
    const data: TopNavMenuData = {
      id: 'test',
      label: 'test',
      iconType: 'beaker',
      iconSide: 'right',
      emphasize: true,
      run: jest.fn(),
    };

    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toHaveBeenCalledTimes(1);
    expect(component).toMatchSnapshot();
  });

  it('Should render disabled item and it shouldnt be clickable', () => {
    ensureMenuItemDisabled({
      id: 'test',
      label: 'test',
      disableButton: true,
      run: jest.fn(),
    });
  });

  it('Should render item with disable function and it shouldnt be clickable', () => {
    ensureMenuItemDisabled({
      id: 'test',
      label: 'test',
      disableButton: () => true,
      run: jest.fn(),
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
    });
  });
});

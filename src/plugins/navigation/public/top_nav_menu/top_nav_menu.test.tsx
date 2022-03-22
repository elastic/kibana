/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { MountPoint } from 'kibana/public';
import { TopNavMenu } from './top_nav_menu';
import { TopNavMenuData } from './top_nav_menu_data';
import { shallowWithIntl, mountWithIntl } from '@kbn/test-jest-helpers';

const dataShim = {
  ui: {
    SearchBar: () => <div className="searchBar" />,
  },
};

describe('TopNavMenu', () => {
  const WRAPPER_SELECTOR = '.kbnTopNavMenu__wrapper';
  const TOP_NAV_ITEM_SELECTOR = 'TopNavMenuItem';
  const SEARCH_BAR_SELECTOR = 'SearchBar';
  const menuItems: TopNavMenuData[] = [
    {
      id: 'test',
      label: 'test',
      run: jest.fn(),
    },
    {
      id: 'test2',
      label: 'test2',
      run: jest.fn(),
    },
    {
      id: 'test3',
      label: 'test3',
      run: jest.fn(),
    },
  ];

  it('Should render nothing when no config is provided', () => {
    const component = shallowWithIntl(<TopNavMenu appName={'test'} />);
    expect(component.find(WRAPPER_SELECTOR).length).toBe(0);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(0);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(0);
  });

  it('Should not render menu items when config is empty', () => {
    const component = shallowWithIntl(<TopNavMenu appName={'test'} config={[]} />);
    expect(component.find(WRAPPER_SELECTOR).length).toBe(0);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(0);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(0);
  });

  it('Should render 1 menu item', () => {
    const component = shallowWithIntl(<TopNavMenu appName={'test'} config={[menuItems[0]]} />);
    expect(component.find(WRAPPER_SELECTOR).length).toBe(1);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(1);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(0);
  });

  it('Should render multiple menu items', () => {
    const component = shallowWithIntl(<TopNavMenu appName={'test'} config={menuItems} />);
    expect(component.find(WRAPPER_SELECTOR).length).toBe(1);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(menuItems.length);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(0);
  });

  it('Should render search bar', () => {
    const component = shallowWithIntl(
      <TopNavMenu appName={'test'} showSearchBar={true} data={dataShim as any} />
    );
    expect(component.find(WRAPPER_SELECTOR).length).toBe(1);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(0);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(1);
  });

  it('Should render menu items and search bar', () => {
    const component = shallowWithIntl(
      <TopNavMenu appName={'test'} config={menuItems} showSearchBar={true} data={dataShim as any} />
    );
    expect(component.find(WRAPPER_SELECTOR).length).toBe(1);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(menuItems.length);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(1);
  });

  it('Should render with a class name', () => {
    const component = shallowWithIntl(
      <TopNavMenu
        appName={'test'}
        config={menuItems}
        showSearchBar={true}
        data={dataShim as any}
        className={'myCoolClass'}
      />
    );
    expect(component.find('.kbnTopNavMenu').length).toBe(1);
    expect(component.find('.myCoolClass').length).toBeTruthy();
  });

  describe('when setMenuMountPoint is provided', () => {
    let portalTarget: HTMLElement;
    let mountPoint: MountPoint;
    let setMountPoint: jest.Mock<(mountPoint: MountPoint<HTMLElement>) => void>;
    let dom: ReactWrapper;

    const refresh = () => {
      new Promise(async (resolve, reject) => {
        try {
          if (dom) {
            act(() => {
              dom.update();
            });
          }

          setImmediate(() => resolve(dom)); // flushes any pending promises
        } catch (error) {
          reject(error);
        }
      });
    };

    beforeEach(() => {
      portalTarget = document.createElement('div');
      document.body.append(portalTarget);
      setMountPoint = jest.fn().mockImplementation((mp) => (mountPoint = mp));
    });

    afterEach(() => {
      if (portalTarget) {
        portalTarget.remove();
      }
    });

    it('mounts the menu inside the provided mountPoint', async () => {
      const component = mountWithIntl(
        <TopNavMenu
          appName={'test'}
          config={menuItems}
          showSearchBar={true}
          data={dataShim as any}
          setMenuMountPoint={setMountPoint}
        />
      );

      act(() => {
        mountPoint(portalTarget);
      });

      await refresh();

      expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(1);

      // menu is rendered outside of the component
      expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(0);
    });
  });
});

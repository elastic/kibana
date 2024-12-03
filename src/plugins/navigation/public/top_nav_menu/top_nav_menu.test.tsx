/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { MountPoint } from '@kbn/core/public';
import { TopNavMenu } from './top_nav_menu';
import { TopNavMenuData } from './top_nav_menu_data';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiToolTipProps } from '@elastic/eui';
import type { TopNavMenuBadgeProps } from './top_nav_menu_badges';
import { unifiedSearchMock } from '../mocks';

describe('TopNavMenu', () => {
  const WRAPPER_SELECTOR = '.kbnTopNavMenu__wrapper';
  const BADGES_GROUP_SELECTOR = '.kbnTopNavMenu__badgeGroup';
  const TOP_NAV_ITEM_SELECTOR = 'TopNavMenuItem';
  const SEARCH_BAR_SELECTOR = 'AggregateQuerySearchBar';
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
  const badges: TopNavMenuBadgeProps[] = [
    {
      badgeText: 'badge1',
    },
    {
      'data-test-subj': 'test2',
      badgeText: 'badge2',
      title: '',
      color: 'warning',
      toolTipProps: {
        content: 'tooltip content',
        position: 'bottom',
      } as EuiToolTipProps,
    },
    {
      badgeText: 'badge3',
      renderCustomBadge: ({ badgeText }) => <div data-test-subj="test3">{badgeText}</div>,
    },
  ];

  it('Should render nothing when no config is provided', () => {
    const component = mountWithIntl(<TopNavMenu appName={'test'} />);
    expect(component.find(WRAPPER_SELECTOR).length).toBe(0);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(0);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(0);
  });

  it('Should not render menu items when config is empty', () => {
    const component = mountWithIntl(<TopNavMenu appName={'test'} config={[]} />);
    expect(component.find(WRAPPER_SELECTOR).length).toBe(0);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(0);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(0);
  });

  it('Should render 1 menu item', () => {
    const component = mountWithIntl(<TopNavMenu appName={'test'} config={[menuItems[0]]} />);
    expect(component.find(WRAPPER_SELECTOR).length).toBe(1);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(1);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(0);
  });

  it('Should render multiple menu items', () => {
    const component = mountWithIntl(<TopNavMenu appName={'test'} config={menuItems} />);
    expect(component.find(WRAPPER_SELECTOR).length).toBe(1);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(menuItems.length);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(0);
  });

  it('Should render search bar', () => {
    const component = mountWithIntl(
      <TopNavMenu appName={'test'} showSearchBar={true} unifiedSearch={unifiedSearchMock} />
    );
    expect(component.find(WRAPPER_SELECTOR).length).toBe(1);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(0);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(1);
  });

  it('Should render menu items and search bar', () => {
    const component = mountWithIntl(
      <TopNavMenu
        appName={'test'}
        config={menuItems}
        showSearchBar={true}
        unifiedSearch={unifiedSearchMock}
      />
    );
    expect(component.find(WRAPPER_SELECTOR).length).toBe(1);
    expect(component.find(TOP_NAV_ITEM_SELECTOR).length).toBe(menuItems.length);
    expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(1);
  });

  it('Should render with a class name', () => {
    const component = mountWithIntl(
      <TopNavMenu
        appName={'test'}
        config={menuItems}
        showSearchBar={true}
        unifiedSearch={unifiedSearchMock}
        className={'myCoolClass'}
      />
    );
    expect(findTestSubject(component, 'top-nav').hasClass('kbnTopNavMenu')).toBe(true);
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
          unifiedSearch={unifiedSearchMock}
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

    it('should render badges and search bar', async () => {
      const component = mountWithIntl(
        <TopNavMenu
          appName={'test'}
          badges={badges}
          showSearchBar={true}
          unifiedSearch={unifiedSearchMock}
          setMenuMountPoint={setMountPoint}
        />
      );

      act(() => {
        mountPoint(portalTarget);
      });

      await refresh();

      expect(component.find(SEARCH_BAR_SELECTOR).length).toBe(1);
      expect(portalTarget.querySelector(BADGES_GROUP_SELECTOR)).toMatchSnapshot();
    });
  });
});

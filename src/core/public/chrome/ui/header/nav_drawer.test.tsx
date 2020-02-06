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

import { cloneDeep } from 'lodash';
import { mount } from 'enzyme';
import React from 'react';
import { NavSetting } from './';
import { ChromeNavLink } from '../../../';
import { AppCategory } from 'src/core/types';
import { DEFAULT_APP_CATEGORIES } from '../../../../utils';
import { NavDrawer } from './nav_drawer';
import { euiNavLink } from './nav_link';

const { analyze, management, observability, security } = DEFAULT_APP_CATEGORIES;
const mockIBasePath = {
  get: () => '/app',
  prepend: () => '/app',
  remove: () => '/app',
};

const getMockProps = (chromeNavLinks: ChromeNavLink[], navSetting: NavSetting = 'grouped') => ({
  navSetting,
  navLinks: chromeNavLinks.map(link =>
    euiNavLink(link, true, undefined, mockIBasePath, () => Promise.resolve())
  ),
  chromeNavLinks,
  recentlyAccessedItems: [],
  basePath: mockIBasePath,
});

const makeLink = (id: string, order: number, category?: AppCategory) => ({
  id,
  category,
  order,
  title: id,
  baseUrl: `http://localhost:5601/app/${id}`,
  legacy: true,
});

const getMockChromeNavLink = () =>
  cloneDeep([
    makeLink('discover', 100, analyze),
    makeLink('siem', 500, security),
    makeLink('metrics', 600, observability),
    makeLink('monitoring', 800, management),
    makeLink('visualize', 200, analyze),
    makeLink('dashboard', 300, analyze),
    makeLink('canvas', 400, { label: 'customCategory' }),
    makeLink('logs', 700, observability),
  ]);

describe('NavDrawer', () => {
  describe('Advanced setting set to individual', () => {
    it('renders individual items', () => {
      const component = mount(
        <NavDrawer {...getMockProps(getMockChromeNavLink(), 'individual')} />
      );
      expect(component).toMatchSnapshot();
    });
  });
  describe('Advanced setting set to grouped', () => {
    it('renders individual items if there are less than 7', () => {
      const links = getMockChromeNavLink().slice(0, 5);
      const component = mount(<NavDrawer {...getMockProps(links)} />);
      expect(component).toMatchSnapshot();
    });
    it('renders individual items if there is only 1 category', () => {
      // management doesn't count as a category
      const navLinks = [
        makeLink('discover', 100, analyze),
        makeLink('siem', 500, analyze),
        makeLink('metrics', 600, analyze),
        makeLink('monitoring', 800, analyze),
        makeLink('visualize', 200, analyze),
        makeLink('dashboard', 300, management),
        makeLink('canvas', 400, management),
        makeLink('logs', 700, management),
      ];
      const component = mount(<NavDrawer {...getMockProps(navLinks)} />);
      expect(component).toMatchSnapshot();
    });
    it('renders grouped items', () => {
      const component = mount(<NavDrawer {...getMockProps(getMockChromeNavLink())} />);
      expect(component).toMatchSnapshot();
    });
  });
});

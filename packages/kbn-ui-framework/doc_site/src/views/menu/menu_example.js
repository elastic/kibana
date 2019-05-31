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

/* eslint-disable import/no-duplicates */

import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import Menu from './menu';
import menuSource from '!!raw-loader!./menu';
const menuHtml = renderToHtml(Menu);

import MenuContained from './menu_contained';
import menuContainedSource from '!!raw-loader!./menu_contained';
const menuContainedHtml = renderToHtml(MenuContained);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Menu"
      source={[{
        type: GuideSectionTypes.JS,
        code: menuSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: menuHtml,
      }]}
    >
      <GuideDemo>
        <Menu />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Menu, contained"
      source={[{
        type: GuideSectionTypes.JS,
        code: menuContainedSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: menuContainedHtml,
      }]}
    >
      <GuideDemo>
        <MenuContained />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

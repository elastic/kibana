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

import { GuideDemo, GuidePage, GuideSection, GuideSectionTypes, GuideText } from '../../components';

import { ToolBarPager } from './tool_bar_pager';
import toolBarPagerSource from '!!raw-loader!./tool_bar_pager'; // eslint-disable-line import/default
const toolBarPagerHtml = renderToHtml(ToolBarPager);

import { PagerButtons } from './pager_buttons';
import pagerButtonsSource from '!!raw-loader!./pager_buttons'; // eslint-disable-line import/default
const pagerButtonsHtml = renderToHtml(PagerButtons);

export default (props) => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Pager"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: toolBarPagerSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: toolBarPagerHtml,
        },
      ]}
    >
      <GuideText>Use the Pager in a tool bar.</GuideText>

      <GuideDemo>
        <ToolBarPager />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Pager Buttons"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: pagerButtonsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: pagerButtonsHtml,
        },
      ]}
    >
      <GuideText>Use the Pager Buttons to navigate through a set of items.</GuideText>

      <GuideDemo>
        <PagerButtons />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

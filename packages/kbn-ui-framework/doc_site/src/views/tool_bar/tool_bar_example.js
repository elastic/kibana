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

import { ToolBar } from './tool_bar';
import toolBarSource from '!!raw-loader!./tool_bar'; // eslint-disable-line import/default
const toolBarHtml = renderToHtml(ToolBar);

import { ToolBarFooter } from './tool_bar_footer';
import toolBarFooterSource from '!!raw-loader!./tool_bar_footer'; // eslint-disable-line import/default
const toolBarFooterHtml = renderToHtml(ToolBarFooter);

export default (props) => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ToolBar"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: toolBarSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: toolBarHtml,
        },
      ]}
    >
      <GuideText>
        Use the ToolBar to surface controls for manipulating and filtering content, e.g. in a list,
        table, or menu.
      </GuideText>

      <GuideDemo>
        <ToolBar />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ToolBarFooter"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: toolBarFooterSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: toolBarFooterHtml,
        },
      ]}
    >
      <GuideText>
        Use the ToolBarFooter in conjunction with the ToolBar. It can surface secondary controls or
        a subset of the primary controls.
      </GuideText>

      <GuideDemo>
        <ToolBarFooter />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

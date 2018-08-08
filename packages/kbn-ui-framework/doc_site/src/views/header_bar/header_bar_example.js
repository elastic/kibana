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

import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import HeaderBar from './header_bar';
const headerBarSource = require('!!raw-loader!./header_bar');
const headerBarHtml = renderToHtml(HeaderBar);

import HeaderBarTwoSections from './header_bar_two_sections';
const headerBarTwoSectionsSource = require('!!raw-loader!./header_bar_two_sections');
const headerBarTwoSectionsHtml = renderToHtml(HeaderBarTwoSections);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Header Bar"
      source={[{
        type: GuideSectionTypes.JS,
        code: headerBarSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: headerBarHtml,
      }]}
    >
      <GuideDemo>
        <HeaderBar />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Two sections"
      source={[{
        type: GuideSectionTypes.JS,
        code: headerBarTwoSectionsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: headerBarTwoSectionsHtml,
      }]}
    >
      <GuideDemo>
        <HeaderBarTwoSections />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

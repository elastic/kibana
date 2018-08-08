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
  GuideText,
} from '../../components';

import Example from './info_button';

const basicSource = require('!!raw-loader!./info_button');
const basicHtml = renderToHtml(Example);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Info Button"
      source={[{
        type: GuideSectionTypes.JS,
        code: basicSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: basicHtml,
      }]}
    >
      <GuideText>
        This is just button with an info icon, used for a keyboard-accessible
        trigger for helpful inline content. For example, use it as a tooltip
        trigger.
      </GuideText>

      <GuideDemo>
        <Example />
      </GuideDemo>
    </GuideSection>

  </GuidePage>
);

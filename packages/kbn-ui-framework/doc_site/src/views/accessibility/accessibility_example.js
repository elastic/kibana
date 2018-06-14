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
  GuideCode,
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import KeyboardAccessible from './keyboard_accessible';
import ScreenReaderOnly from './screen_reader';

const keyboardAccessibleSource = require('!!raw-loader!./keyboard_accessible');
const keyboardAccessibleHtml = renderToHtml(KeyboardAccessible);

const screenReaderOnlyHtml = renderToHtml(ScreenReaderOnly);
const screenReaderOnlySource = require('!!raw-loader!./screen_reader');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="KeyboardAccessible"
      source={[{
        type: GuideSectionTypes.JS,
        code: keyboardAccessibleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: keyboardAccessibleHtml,
      }]}
    >
      <GuideText>
        You can make interactive elements keyboard-accessible with this component. This is necessary
        for non-button elements and <GuideCode>a</GuideCode> tags without
        <GuideCode>href</GuideCode> attributes.
      </GuideText>

      <GuideDemo>
        <KeyboardAccessible />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ScreenReaderOnly"
      source={[{
        type: GuideSectionTypes.JS,
        code: screenReaderOnlySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: screenReaderOnlyHtml,
      }]}
    >
      <GuideText>
        This class can be useful to add accessibility to older designs that are
        still in use, but it shouldn&rsquo;t be a permanent solution. See {(
          <GuideLink
            href="http://webaim.org/techniques/css/invisiblecontent/"
          >
            http://webaim.org/techniques/css/invisiblecontent/
          </GuideLink>
        )} for more information.
      </GuideText>

      <GuideText>
        Use a screenreader to verify that there is a second paragraph in this example:
      </GuideText>

      <GuideDemo>
        <ScreenReaderOnly />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

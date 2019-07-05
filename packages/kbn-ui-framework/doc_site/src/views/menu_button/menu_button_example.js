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

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import basicHtml from './menu_button_basic.html';
import primaryHtml from './menu_button_primary.html';
import dangerHtml from './menu_button_danger.html';
import withIconHtml from './menu_button_with_icon.html';
import groupHtml from './menu_button_group.html';
import elementsHtml from './menu_button_elements.html';

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Basic MenuButton"
      source={[{
        type: GuideSectionTypes.HTML,
        code: basicHtml,
      }]}
    >
      <GuideDemo
        html={basicHtml}
      />
    </GuideSection>

    <GuideSection
      title="Primary MenuButton"
      source={[{
        type: GuideSectionTypes.HTML,
        code: primaryHtml,
      }]}
    >
      <GuideDemo
        html={primaryHtml}
      />
    </GuideSection>

    <GuideSection
      title="Danger MenuButton"
      source={[{
        type: GuideSectionTypes.HTML,
        code: dangerHtml,
      }]}
    >
      <GuideDemo
        html={dangerHtml}
      />
    </GuideSection>

    <GuideSection
      title="MenuButton with Icon"
      source={[{
        type: GuideSectionTypes.HTML,
        code: withIconHtml,
      }]}
    >
      <GuideText>
        You can use a MenuButton with an Icon, with or without text.
      </GuideText>

      <GuideDemo
        html={withIconHtml}
      />
    </GuideSection>

    <GuideSection
      title="MenuButtonGroup"
      source={[{
        type: GuideSectionTypes.HTML,
        code: groupHtml,
      }]}
    >
      <GuideDemo
        html={groupHtml}
      />
    </GuideSection>

    <GuideSection
      title="Element variations"
      source={[{
        type: GuideSectionTypes.HTML,
        code: elementsHtml,
      }]}
    >
      <GuideText>
        You can create a MenuButton using a button element, link, or input[type=&ldquo;submit&rdquo;].
      </GuideText>

      <GuideDemo
        html={elementsHtml}
      />
    </GuideSection>
  </GuidePage>
);

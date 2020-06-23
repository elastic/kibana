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
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import titleHtml from './title.html';
import subTitleHtml from './sub_title.html';
import textTitleHtml from './text_title.html';
import textHtml from './text.html';
import subTextHtml from './sub_text.html';
import subduedHtml from './subdued_type.html';

export default (props) => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Title"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: titleHtml,
        },
      ]}
    >
      <GuideText>
        Works well with an <GuideCode>h1</GuideCode>.
      </GuideText>

      <GuideDemo html={titleHtml} />
    </GuideSection>

    <GuideSection
      title="SubTitle"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: subTitleHtml,
        },
      ]}
    >
      <GuideText>
        Works well with an <GuideCode>h2</GuideCode>.
      </GuideText>

      <GuideDemo html={subTitleHtml} />
    </GuideSection>

    <GuideSection
      title="TextTItle"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: textTitleHtml,
        },
      ]}
    >
      <GuideText>Titles for paragraphs.</GuideText>

      <GuideDemo html={textTitleHtml} />
    </GuideSection>

    <GuideSection
      title="Text"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: textHtml,
        },
      ]}
    >
      <GuideText>
        Works well with a <GuideCode>p</GuideCode>.
      </GuideText>

      <GuideDemo html={textHtml} />
    </GuideSection>

    <GuideSection
      title="SubText"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: subTextHtml,
        },
      ]}
    >
      <GuideText>For really unimportant information.</GuideText>

      <GuideDemo html={subTextHtml} />
    </GuideSection>

    <GuideSection
      title="Subdued type"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: subduedHtml,
        },
      ]}
    >
      <GuideText>You can drop type a half-step down in the type hierarchy.</GuideText>

      <GuideDemo html={subduedHtml} />
    </GuideSection>
  </GuidePage>
);

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

import { GuideDemo, GuidePage, GuideSection, GuideSectionTypes, GuideText } from '../../components';

import verticalRhythmHtml from './vertical_rhythm.html';
import verticalRhythmSmallHtml from './vertical_rhythm_small.html';
import verticalRhythmAsWrapperHtml from './vertical_rhythm_as_wrapper.html';
import verticalRhythmOnComponentHtml from './vertical_rhythm_on_component.html';

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="VerticalRhythm"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: verticalRhythmHtml,
        },
      ]}
    >
      <GuideText>VerticalRhythm creates regular vertical spacing between elements.</GuideText>

      <GuideText>
        <strong>Note:</strong> It only works if two adjacent elements have this class applied, in
        which case it will create space between them.
      </GuideText>

      <GuideDemo html={verticalRhythmHtml} />
    </GuideSection>

    <GuideSection
      title="VerticalRhythmSmall"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: verticalRhythmSmallHtml,
        },
      ]}
    >
      <GuideDemo html={verticalRhythmSmallHtml} />
    </GuideSection>

    <GuideSection
      title="VerticalRhythm as wrapper"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: verticalRhythmAsWrapperHtml,
        },
      ]}
    >
      <GuideText>
        Wrap any series of components, e.g. Panel, in the VerticalRhythm component to space them
        apart.
      </GuideText>

      <GuideDemo html={verticalRhythmAsWrapperHtml} />
    </GuideSection>

    <GuideSection
      title="VerticalRhythm on component"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: verticalRhythmOnComponentHtml,
        },
      ]}
    >
      <GuideText>You can also apply the VerticalRhythm class directly to components.</GuideText>

      <GuideDemo html={verticalRhythmOnComponentHtml} />
    </GuideSection>
  </GuidePage>
);

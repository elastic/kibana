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

import Bar from './bar';
import barSource from '!!raw-loader!./bar';
const barHtml = renderToHtml(Bar);

import BarOneSection from './bar_one_section';
import barOneSectionSource from '!!raw-loader!./bar_one_section';
const barOneSectionHtml = renderToHtml(BarOneSection);

import BarThreeSections from './bar_three_sections';
import barThreeSectionsSource from '!!raw-loader!./bar_three_sections';
const barThreeSectionsHtml = renderToHtml(BarThreeSections);

export default (props) => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Bar"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: barSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: barHtml,
        },
      ]}
    >
      <GuideText>
        Use the Bar to organize controls in a horizontal layout. This is especially useful for
        surfacing controls in the corners of a view.
      </GuideText>

      <GuideText>
        <strong>Note:</strong> Instead of using this component with a Table, try using the
        ControlledTable, ToolBar, and ToolBarFooter components.
      </GuideText>

      <GuideDemo>
        <Bar />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="One section"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: barOneSectionSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: barOneSectionHtml,
        },
      ]}
    >
      <GuideText>
        A Bar with one section will align it to the right, by default. To align it to the left, just
        add another section and leave it empty, or don&rsquo;t use a Bar at all.
      </GuideText>

      <GuideDemo>
        <BarOneSection />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Three sections"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: barThreeSectionsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: barThreeSectionsHtml,
        },
      ]}
    >
      <GuideText>
        Technically the Bar can contain three or more sections, but there&rsquo;s no established
        use-case for this.
      </GuideText>

      <GuideDemo>
        <BarThreeSections />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

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

import CollapseButton from './collapse_button';
import collapseButtonSource from '!!raw-loader!./collapse_button';
const collapseButtonHtml = renderToHtml(CollapseButton);

import CollapseButtonAria from './collapse_button_aria';
import collapseButtonAriaSource from '!!raw-loader!./collapse_button_aria';
const collapseButtonAriaHtml = renderToHtml(CollapseButtonAria);

export default (props) => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="CollapseButton"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: collapseButtonSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: collapseButtonHtml,
        },
      ]}
    >
      <GuideText>
        Use this button to collapse and expand panels, drawers, sidebars, legends, and other
        containers.
      </GuideText>

      <GuideDemo>
        <CollapseButton />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="CollapseButton accessibility"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: collapseButtonAriaSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: collapseButtonAriaHtml,
        },
      ]}
    >
      <GuideText>
        To make an expandable element properly accessible you should add the following
        ARIA-attributes to it:
        <dl>
          <dt>
            <code>aria-expanded</code>
          </dt>
          <dd>
            should be <code>true</code> or <code>false</code> depending on the state of the
            collapsable content.
          </dd>
          <dt>
            <code>aria-controls</code>
          </dt>
          <dd>
            should reference the <code>id</code> of the actual collapsable content element.
          </dd>
          <dt>
            <code>aria-label</code>
          </dt>
          <dd>
            should contain a label like &quot;Toggle panel&quot; or preferably more specific what it
            toggles (e.g. &quot;Toggle filter actions&quot;). You don&rsquo;t need to switch the
            label when the state changes, since a screen reader will use <code>aria-expanded</code>{' '}
            to read out the current state.
          </dd>
        </dl>
        The following example demonstrate the usage of these attributes.
      </GuideText>

      <GuideDemo>
        <CollapseButtonAria />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

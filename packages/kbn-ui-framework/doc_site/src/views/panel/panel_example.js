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

import panelHtml from './panel.html';
import panelWithToolBarHtml from './panel_with_toolbar.html';
import panelWithHeaderSectionsHtml from './panel_with_header_sections.html';

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Panel"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: panelHtml,
        },
      ]}
    >
      <GuideDemo html={panelHtml} />
    </GuideSection>

    <GuideSection
      title="Panel with PanelHeaderSections"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: panelWithHeaderSectionsHtml,
        },
      ]}
    >
      <GuideText>PanelHeaders can have sections.</GuideText>

      <GuideDemo html={panelWithHeaderSectionsHtml} />
    </GuideSection>

    <GuideSection
      title="Panel with Toolbar"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: panelWithToolBarHtml,
        },
      ]}
    >
      <GuideText>
        Panels can live within toolbar sections. This is normally used as replacement for an empty
        table.
      </GuideText>

      <GuideDemo html={panelWithToolBarHtml} />
    </GuideSection>
  </GuidePage>
);

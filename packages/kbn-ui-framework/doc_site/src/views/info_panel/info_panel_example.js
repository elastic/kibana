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

import infoHtml from './info_panel_info.html';
import successHtml from './info_panel_success.html';
import warningHtml from './info_panel_warning.html';
import errorHtml from './info_panel_error.html';

export default (props) => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Info"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: infoHtml,
        },
      ]}
    >
      <GuideText>Use this InfoPanel to generally inform the user.</GuideText>

      <GuideDemo html={infoHtml} />
    </GuideSection>

    <GuideSection
      title="Success"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: successHtml,
        },
      ]}
    >
      <GuideText>
        Use this InfoPanel to notify the user of an action successfully completing.
      </GuideText>

      <GuideDemo html={successHtml} />
    </GuideSection>

    <GuideSection
      title="Warning"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: warningHtml,
        },
      ]}
    >
      <GuideText>
        Use this InfoPanel to warn the user against decisions they might regret.
      </GuideText>

      <GuideDemo html={warningHtml} />
    </GuideSection>

    <GuideSection
      title="Error"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: errorHtml,
        },
      ]}
    >
      <GuideText>Use this InfoPanel to let the user know something went wrong.</GuideText>

      <GuideDemo html={errorHtml} />
    </GuideSection>
  </GuidePage>
);

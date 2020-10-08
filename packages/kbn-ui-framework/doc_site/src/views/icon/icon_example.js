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

import iconHtml from './icon.html';
import infoHtml from './icon_info.html';
import basicHtml from './icon_basic.html';
import successHtml from './icon_success.html';
import warningHtml from './icon_warning.html';
import errorHtml from './icon_error.html';
import inactiveHtml from './icon_inactive.html';
import spinnerHtml from './icon_spinner.html';
import spinnerJs from 'raw-loader!./icon_spinner.js';

export default (props) => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Icon"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: iconHtml,
        },
      ]}
    >
      <GuideText>
        Use the <GuideCode>icon</GuideCode> class instead of the <GuideCode>fa</GuideCode> class for
        FontAwesome icons. This will make it easier for us to migrate away from FontAwesome.
      </GuideText>

      <GuideDemo html={iconHtml} />
    </GuideSection>

    <GuideSection
      title="Info"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: infoHtml,
        },
      ]}
    >
      <GuideText>Use this Icon to denote useful information.</GuideText>

      <GuideDemo html={infoHtml} />
    </GuideSection>

    <GuideSection
      title="Basic"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: basicHtml,
        },
      ]}
    >
      <GuideText>
        Use this Icon when you don&rsquo;t want to communicate any particular meaning with the
        icon&rsquo;s color.
      </GuideText>

      <GuideDemo html={basicHtml} />
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
        Use this Icon to denote the successful completion of an action, e.g. filling out a form
        field correctly or a successful API request.
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
      <GuideText>Use this Icon to denote an irregularity or potential problems.</GuideText>

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
      <GuideText>
        Use this Icon to denote a failed attempt at an action, e.g. an invalid form field or an API
        error.
      </GuideText>

      <GuideDemo html={errorHtml} />
    </GuideSection>

    <GuideSection
      title="Inactive"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: inactiveHtml,
        },
      ]}
    >
      <GuideText>
        Use this Icon to denote a disabled, inactive, off, offline, or asleep status.
      </GuideText>

      <GuideDemo html={inactiveHtml} />
    </GuideSection>

    <GuideSection
      title="Spinner"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: spinnerHtml,
        },
      ]}
    >
      <GuideText>You can use Icons to represent a loading and successfully-loaded state.</GuideText>

      <GuideDemo html={spinnerHtml} js={spinnerJs} />
    </GuideSection>
  </GuidePage>
);

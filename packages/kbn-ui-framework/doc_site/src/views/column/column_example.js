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

const columnsHtml = require('./columns.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Columns"
      source={[{
        type: GuideSectionTypes.HTML,
        code: columnsHtml,
      }]}
    >
      <GuideText>
        <strong>Note:</strong> Don&rsquo;t use this. It&rsquo;s subject to change as we evolve our grid system.
      </GuideText>

      <GuideText>
        This is a substitute grid system. It uses <GuideCode>display: inline-block</GuideCode>, so
        you need to structure your markup to leave no whitespace between each column.
      </GuideText>

      <GuideDemo
        html={columnsHtml}
      />
    </GuideSection>
  </GuidePage>
);

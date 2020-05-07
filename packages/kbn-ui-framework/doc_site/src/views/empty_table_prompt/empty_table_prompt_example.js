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

import { EmptyTablePrompt } from './empty_table_prompt';
import emptyTablePromptSource from '!!raw-loader!./empty_table_prompt'; // eslint-disable-line import/default
const emptyTablePromptHtml = renderToHtml(EmptyTablePrompt);

import { ControlledTableWithEmptyPrompt } from './table_with_empty_prompt';
import tableWithEmptyPromptSource from '!!raw-loader!./table_with_empty_prompt'; // eslint-disable-line import/default
const tableWithEmptyPromptHtml = renderToHtml(ControlledTableWithEmptyPrompt);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Empty table prompt"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: emptyTablePromptSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: emptyTablePromptHtml,
        },
      ]}
    >
      <GuideText>
        Use this prompt when a table has no results. It helps create space and provides a place to
        prompt the user to follow some next actions, such as creating an item.
      </GuideText>

      <GuideDemo>
        <EmptyTablePrompt />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Controlled table with empty table prompt"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: tableWithEmptyPromptSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: tableWithEmptyPromptHtml,
        },
      ]}
    >
      <GuideText>Wrap in an EmptyTablePromptPanel when using with a controlled table.</GuideText>

      <GuideDemo>
        <ControlledTableWithEmptyPrompt />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

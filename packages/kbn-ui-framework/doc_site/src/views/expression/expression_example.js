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

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Expression from './expression';
import expressionSource from '!!raw-loader!./expression';
const expressionHtml = renderToHtml(Expression, { defaultActiveButton: 'example2' });

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ExpressionButton"
      source={[{
        type: GuideSectionTypes.JS,
        code: expressionSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: expressionHtml,
      }]}
    >
      <GuideText>
        ExpressionButtons allow you to compress a complicated form into a small space.
      </GuideText>

      <GuideDemo>
        <Expression defaultActiveButton="example2"/>
      </GuideDemo>
    </GuideSection>

  </GuidePage>
);

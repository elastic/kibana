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

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Card from './card';
const cardSource = require('!!raw-loader!./card');
const cardHtml = renderToHtml(Card);

import CardGroup from './card_group';
const cardGroupSource = require('!!raw-loader!./card_group');
const cardGroupHtml = renderToHtml(CardGroup);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Card"
      source={[{
        type: GuideSectionTypes.JS,
        code: cardSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: cardHtml,
      }]}
    >
      <GuideText>
        Cards expand to fill their container. To restrict a card&rsquo;s width, define the width of its
        container.
      </GuideText>

      <GuideDemo>
        <Card />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="CardGroup"
      source={[{
        type: GuideSectionTypes.JS,
        code: cardGroupSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: cardGroupHtml,
      }]}
    >
      <GuideDemo>
        <CardGroup />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

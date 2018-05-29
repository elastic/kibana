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

import Event from './event';
const eventSource = require('!!raw-loader!./event');
const eventHtml = renderToHtml(Event);

import EventMenu from './event_menu';
const eventMenuSource = require('!!raw-loader!./event_menu');
const eventMenuHtml = renderToHtml(EventMenu);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Event"
      source={[{
        type: GuideSectionTypes.JS,
        code: eventSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: eventHtml,
      }]}
    >
      <GuideText>
        Events can represent updates, logs, notifications, and status changes.
      </GuideText>

      <GuideDemo>
        <Event />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Event Menu"
      source={[{
        type: GuideSectionTypes.JS,
        code: eventMenuSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: eventMenuHtml,
      }]}
    >
      <GuideText>
        You&rsquo;ll typically want to present them within a Menu.
      </GuideText>

      <GuideDemo>
        <EventMenu />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

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
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import { ModalExample } from './modal';
const modalSource = require('!!raw-loader!./modal');
const modalHtml = renderToHtml(ModalExample);

import { ConfirmModalExample } from './confirm_modal';
const confirmModalSource = require('!!raw-loader!./confirm_modal');
const confirmModalHtml = renderToHtml(ConfirmModalExample);

export default props => (
  <GuidePage title={props.route.name}>

    <GuideSection
      title="Confirmation Modal"
      source={[{
        type: GuideSectionTypes.JS,
        code: modalSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: modalHtml,
      }]}
    >
      <GuideText>
        Use a <GuideCode>KuiModal</GuideCode> to temporarily escape the current UX and create
        another UX within it.
      </GuideText>

      <GuideDemo>
        <ModalExample />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Pop up Confirmation Modal with Overlay"
      source={[{
        type: GuideSectionTypes.JS,
        code: confirmModalSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: confirmModalHtml,
      }]}
    >
      <GuideDemo>
        <ConfirmModalExample />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

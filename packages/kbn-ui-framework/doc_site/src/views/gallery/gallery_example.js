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
  GuideText
} from '../../components';

import Gallery from './gallery';
const gallerySource = require('!!raw-loader!./gallery');
const galleryHtml = renderToHtml(Gallery);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Gallery"
      source={[{
        type: GuideSectionTypes.JS,
        code: gallerySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: galleryHtml,
      }]}
    >
      <GuideText>
        Use GalleryItem to show a gallery item.
        If you specify an <GuideCode>href</GuideCode> property the item will render
        as an HTML <GuideCode>a</GuideCode> element. If not, it will be rendered
        as a <GuideCode>button</GuideCode> and you can attach an
        <GuideCode>onClick</GuideCode> listener to it.
      </GuideText>

      <GuideText>
        <strong>Note:</strong> You are not allowed to specify the <GuideCode>href</GuideCode> property
        and the <GuideCode>onClick</GuideCode> property at the same time.
      </GuideText>

      <GuideDemo>
        <Gallery />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

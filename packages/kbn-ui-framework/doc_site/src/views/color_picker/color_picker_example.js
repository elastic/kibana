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
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import { renderToHtml } from '../../services';

import { ColorPicker } from './color_picker';
const colorPickerSource = require('!!raw-loader!./color_picker');
const colorPickerHtml = renderToHtml(ColorPicker);

import { ColorPickerLabelAndClear } from './color_picker_clear';
const colorPickerClearSource = require('!!raw-loader!./color_picker_clear');
const colorPickerClearHtml = renderToHtml(ColorPickerLabelAndClear);

import { ColorPickerNoColorLabel } from './color_picker_no_color_label';
const colorPickerNoColorLabelSource = require('!!raw-loader!./color_picker_no_color_label');
const colorPickerNoColorLabelHtml = renderToHtml(ColorPickerNoColorLabel);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Color Picker"
      source={[{
        type: GuideSectionTypes.JS,
        code: colorPickerSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: colorPickerHtml,
      }]}
    >
      <GuideDemo>
        <ColorPicker />
      </GuideDemo>
    </GuideSection>
    <GuideSection
      title="Color Picker with label and reset link"
      source={[{
        type: GuideSectionTypes.JS,
        code: colorPickerClearSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: colorPickerClearHtml,
      }]}
    >
      <GuideDemo>
        <ColorPickerLabelAndClear />
      </GuideDemo>
    </GuideSection>
    <GuideSection
      title="Color Picker without a color label"
      source={[{
        type: GuideSectionTypes.JS,
        code: colorPickerNoColorLabelSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: colorPickerNoColorLabelHtml,
      }]}
    >
      <GuideDemo>
        <ColorPickerNoColorLabel />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

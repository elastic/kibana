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
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import assistedInputHtml from './assisted_input.html';
import searchInputHtml from './search_input.html';
import staticInputHtml from './static_input.html';

import Label from './label';
import labelSource from '!!raw-loader!./label';
const labelHtml = renderToHtml(Label);

import TextInput from './text_input';
import textInputSource from '!!raw-loader!./text_input';
const textInputHtml = renderToHtml(TextInput, { id: '1' });

import TextArea from './text_area';
import textAreaSource from '!!raw-loader!./text_area';
const textAreaHtml = renderToHtml(TextArea);

import TextAreaNonResizable from './text_area_non_resizable';
import textAreaNonResizableSource from '!!raw-loader!./text_area_non_resizable';
const textAreaNonResizableHtml = renderToHtml(TextAreaNonResizable);

import Select from './select';
import selectSource from '!!raw-loader!./select';
const selectHtml = renderToHtml(Select);

import CheckBox from './check_box';
import checkBoxSource from '!!raw-loader!./check_box';
const checkBoxHtml = renderToHtml(CheckBox);

export default (props) => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Label"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: labelSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: labelHtml,
        },
      ]}
    >
      <GuideText>
        Never forget to label every input element. You can either use a <GuideCode>label</GuideCode>{' '}
        element with a <GuideCode>for</GuideCode> attribute referencing the{' '}
        <GuideCode>id</GuideCode> of the input field, wrap the <GuideCode>input</GuideCode> field
        within the <GuideCode>label</GuideCode> element or use <GuideCode>aria-label</GuideCode> or{' '}
        <GuideCode>aria-labelledby</GuideCode>.
      </GuideText>

      <GuideText>
        For the sake of simplicity we haven&rsquo;t labeled the input elements on this page
        correctly.
      </GuideText>

      <GuideDemo>
        <Label />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="TextInput"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: textInputSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: textInputHtml,
        },
      ]}
    >
      <GuideDemo>
        <TextInput />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="AssistedInput"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: assistedInputHtml,
        },
      ]}
    >
      <GuideText>
        <strong>Note:</strong> You have to specify right-side padding using a custom class or inline
        style to keep the input text from overlapping with the assistance content. Use{' '}
        <GuideCode>em</GuideCode> units for this padding so that it scales appropriately if the user
        changes their root font-size.
      </GuideText>

      <GuideDemo html={assistedInputHtml} />
    </GuideSection>

    <GuideSection
      title="SearchInput"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: searchInputHtml,
        },
      ]}
    >
      <GuideDemo html={searchInputHtml} />
    </GuideSection>

    <GuideSection
      title="StaticInput"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: staticInputHtml,
        },
      ]}
    >
      <GuideText>
        Use StaticInput to display dynamic content in a form which the user isn&rsquo;t allowed to
        edit.
      </GuideText>

      <GuideDemo html={staticInputHtml} />
    </GuideSection>

    <GuideSection
      title="TextArea"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: textAreaSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: textAreaHtml,
        },
      ]}
    >
      <GuideDemo>
        <TextArea />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="TextArea, non-resizable"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: textAreaNonResizableSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: textAreaNonResizableHtml,
        },
      ]}
    >
      <GuideDemo>
        <TextAreaNonResizable />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="CheckBox"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: checkBoxSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: checkBoxHtml,
        },
      ]}
    >
      <GuideDemo>
        <CheckBox />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Select"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: selectSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: selectHtml,
        },
      ]}
    >
      <GuideDemo>
        <Select />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

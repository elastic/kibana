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

import Basic from './button_basic';
import basicSource from '!!raw-loader!./button_basic';
const basicHtml = renderToHtml(Basic);

import Hollow from './button_hollow';
import hollowSource from '!!raw-loader!./button_hollow';
const hollowHtml = renderToHtml(Hollow);

import Primary from './button_primary';
import primarySource from '!!raw-loader!./button_primary';
const primaryHtml = renderToHtml(Primary);

import Secondary from './button_secondary';
import secondarySource from '!!raw-loader!./button_secondary';
const secondaryHtml = renderToHtml(Secondary);

import Danger from './button_danger';
import dangerSource from '!!raw-loader!./button_danger';
const dangerHtml = renderToHtml(Danger);

import Warning from './button_warning';
import warningSource from '!!raw-loader!./button_danger';
const warningHtml = renderToHtml(Warning);

import Loading from './button_loading';
import loadingSource from '!!raw-loader!./button_loading';
const loadingHtml = renderToHtml(Loading, { isLoading: true });

import WithIcon from './button_with_icon';
import withIconSource from '!!raw-loader!./button_with_icon';
const withIconHtml = renderToHtml(WithIcon);

import ButtonGroup from './button_group';
import buttonGroupSource from '!!raw-loader!./button_group';
const buttonGroupHtml = renderToHtml(ButtonGroup);

import ButtonGroupUnited from './button_group_united';
import buttonGroupUnitedSource from '!!raw-loader!./button_group_united';
const buttonGroupUnitedHtml = renderToHtml(ButtonGroupUnited);

import Elements from './button_elements';
import elementsSource from '!!raw-loader!./button_elements';
const elementsHtml = renderToHtml(Elements);

import sizesHtml from './button_sizes.html';

export default (props) => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Basic Button"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: basicSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: basicHtml,
        },
      ]}
    >
      <GuideText>
        Use the basic button for navigation elements or controls that are not the primary focus of
        the page (ex: pagination, toggles...etc).
      </GuideText>

      <GuideDemo>
        <Basic />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Hollow Button"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: hollowSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: hollowHtml,
        },
      ]}
    >
      <GuideText>
        Use the hollow Button when presenting a neutral action, e.g. a &ldquo;Cancel&rdquo; button.
      </GuideText>

      <GuideDemo>
        <Hollow />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Primary Button"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: primarySource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: primaryHtml,
        },
      ]}
    >
      <GuideText>
        Use the primary Button to represent the most common action. Generally, there won&rsquo;t be
        a need to present more than one of these at a time.
      </GuideText>

      <GuideDemo>
        <Primary />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Secondary Button"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: secondarySource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: secondaryHtml,
        },
      ]}
    >
      <GuideText>
        Secondary buttons are usually used for actions (&ldquo;do this&rdquo;) that are optional
        actions on a page.
      </GuideText>

      <GuideDemo>
        <Secondary />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Danger Button"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: dangerSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: dangerHtml,
        },
      ]}
    >
      <GuideText>Danger Buttons represent irreversible, potentially regrettable actions.</GuideText>

      <GuideDemo>
        <Danger />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Warning Button"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: warningSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: warningHtml,
        },
      ]}
    >
      <GuideText>Warning Buttons represent potentially notable actions.</GuideText>

      <GuideDemo>
        <Warning />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Loading Button"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: loadingSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: loadingHtml,
        },
      ]}
    >
      <GuideDemo>
        <Loading />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Button with icon"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: withIconSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: withIconHtml,
        },
      ]}
    >
      <GuideText>
        <p>
          You can toss an icon into a Button, with or without text. You can also use a predefined
          icon or specify custom icon classes. If you have a button without textual content, make
          sure you set the <code>aria-label</code> attribute with a textual representation for
          screen readers (see last example below).
        </p>
      </GuideText>

      <GuideDemo>
        <WithIcon />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ButtonGroup"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: buttonGroupSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: buttonGroupHtml,
        },
      ]}
    >
      <GuideDemo>
        <ButtonGroup />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="United ButtonGroup"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: buttonGroupUnitedSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: buttonGroupUnitedHtml,
        },
      ]}
    >
      <GuideText>
        Use the united version of the ButtonGroup to emphasize the close relationship within a set
        of Buttons, and differentiate them from Buttons outside of the set.
      </GuideText>

      <GuideText>
        They support containing a single Button, so that Buttons can be dynamically added and
        removed.
      </GuideText>

      <GuideDemo>
        <ButtonGroupUnited />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Element variations"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: elementsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: elementsHtml,
        },
      ]}
    >
      <GuideText>
        You can create a Button using a button element, link, or input[type=&ldquo;submit&rdquo;].
      </GuideText>

      <GuideDemo>
        <Elements />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Sizes"
      source={[
        {
          type: GuideSectionTypes.HTML,
          code: sizesHtml,
        },
      ]}
    >
      <GuideDemo html={sizesHtml} />
    </GuideSection>
  </GuidePage>
);

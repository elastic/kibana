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

/* eslint import/no-duplicates: 0, import/default: 0 */
import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import { SimpleLocalNav } from './local_nav_simple';
import simpleLocalNavSource from '!!raw-loader!./local_nav_simple';
const SimpleLocalNavHtml = renderToHtml(SimpleLocalNav);

import { LocalNavWithBreadcrumbs } from './local_nav_breadcrumbs';
import localNavWithBreadcrumbsSource from '!!raw-loader!./local_nav_breadcrumbs';
const localNavWithBreadcrumbsHtml = renderToHtml(LocalNavWithBreadcrumbs);

import { LocalNavWithSearch } from './local_nav_search';
import localNavWithSearchSource from '!!raw-loader!./local_nav_search';
const localNavWithSearchHtml = renderToHtml(LocalNavWithSearch);

import { LocalNavWithSearchError } from './local_nav_search_error';
import localNavWithSearchErrorSource from '!!raw-loader!./local_nav_search_error';
const localNavWithSearchErrorHtml = renderToHtml(LocalNavWithSearchError);

import { LocalNavWithMenuItemStates } from './local_nav_menu_item_states';
import localNavWithMenuItemStatesSource from '!!raw-loader!./local_nav_menu_item_states';
const localNavWithMenuItemStatesHtml = renderToHtml(LocalNavWithMenuItemStates);

import { LocalNavWithDropdown } from './local_nav_dropdown';
import localNavWithDropdownSource from '!!raw-loader!./local_nav_dropdown';
const localNavWithDropdownHtml = renderToHtml(LocalNavWithDropdown);

import { LocalNavWithDropdownPanels } from './local_nav_dropdown_panels';
import localNavWithDropdownPanelsSource from '!!raw-loader!./local_nav_dropdown_panels';
const localNavWithDropdownPanelsHtml = renderToHtml(LocalNavWithDropdownPanels);

import { LocalNavWithTabs } from './local_nav_tabs';
import localNavWithTabsSource from '!!raw-loader!./local_nav_tabs';
const localNavWithTabsHtml = renderToHtml(LocalNavWithTabs);

import datePickerHtml from './local_nav_date_picker.html';

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Simple"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: simpleLocalNavSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: SimpleLocalNavHtml,
        },
      ]}
    >
      <GuideText>
        Here&rsquo;s a simple LocalNav with a Title in the top left corner and Menu in the top right.
      </GuideText>

      <GuideDemo>
        <SimpleLocalNav />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Breadcrumbs"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: localNavWithBreadcrumbsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: localNavWithBreadcrumbsHtml,
        },
      ]}
    >
      <GuideText>
        You can replace the Title with Breadcrumbs.
      </GuideText>

      <GuideDemo>
        <LocalNavWithBreadcrumbs />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Search"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: localNavWithSearchSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: localNavWithSearchHtml,
        },
      ]}
    >
      <GuideText>
        You can add a Search component for filtering results.
      </GuideText>

      <GuideDemo>
        <LocalNavWithSearch />
      </GuideDemo>

    </GuideSection>

    <GuideSection
      title="Invalid Search"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: localNavWithSearchErrorSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: localNavWithSearchErrorHtml,
        },
      ]}
    >
      <GuideDemo>
        <LocalNavWithSearchError />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Selected and disabled Menu Item states"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: localNavWithMenuItemStatesSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: localNavWithMenuItemStatesHtml,
        },
      ]}
    >
      <GuideText>
        When the user selects a Menu Item, additional content can be displayed inside of a Dropdown.
      </GuideText>

      <GuideText>
        Menu Items can also be disabled, in which case they become non-interactive.
      </GuideText>

      <GuideDemo>
        <LocalNavWithMenuItemStates />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Dropdown"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: localNavWithDropdownSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: localNavWithDropdownHtml,
        },
      ]}
    >
      <GuideText>
        Selecting a Menu Item will commonly result in an open Dropdown.
      </GuideText>

      <GuideDemo>
        <LocalNavWithDropdown />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Dropdown panels"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: localNavWithDropdownPanelsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: localNavWithDropdownPanelsHtml,
        },
      ]}
    >
      <GuideText>
        You can split the Dropdown into side-by-side Panels.
      </GuideText>

      <GuideDemo>
        <LocalNavWithDropdownPanels />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Tabs"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: localNavWithTabsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: localNavWithTabsHtml,
        },
      ]}
    >
      <GuideText>
        You can display Tabs for navigating local content.
      </GuideText>

      <GuideDemo>
        <LocalNavWithTabs />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="DatePicker"
      source={[{
        type: GuideSectionTypes.HTML,
        code: datePickerHtml,
      }]}
    >
      <GuideDemo
        html={datePickerHtml}
      />
    </GuideSection>
  </GuidePage>
);


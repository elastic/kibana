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

import { Table } from './table';
import tableSource from '!!raw-loader!./table'; // eslint-disable-line import/default
const tableHtml = renderToHtml(Table);

import { TableWithMenuButtons } from './table_with_menu_buttons';
import tableWithMenuButtonsSource from '!!raw-loader!./table_with_menu_buttons'; // eslint-disable-line import/default
const tableWithMenuButtonsHtml = renderToHtml(TableWithMenuButtons);

import { FluidTable } from './fluid_table';
import fluidTableSource from '!!raw-loader!./fluid_table'; // eslint-disable-line import/default
const fluidTableHtml = renderToHtml(FluidTable);

import { ListingTable } from './listing_table';
import listingTableSource from '!!raw-loader!./listing_table'; // eslint-disable-line import/default
const listingTableHtml = renderToHtml(ListingTable);

import { ListingTableWithEmptyPrompt } from './listing_table_with_empty_prompt';
import listingTableWithEmptyPromptSource from '!!raw-loader!./listing_table_with_empty_prompt'; // eslint-disable-line import/default
const listingTableWithEmptyPromptHtml = renderToHtml(ListingTableWithEmptyPrompt);

import { ListingTableWithNoItems } from './listing_table_with_no_items';
import listingTableWithNoItemsSource from '!!raw-loader!./listing_table_with_no_items'; // eslint-disable-line import/default
const listingTableWithNoItemsHtml = renderToHtml(ListingTableWithNoItems);

import { ListingTableLoadingItems } from './listing_table_loading_items';
import listingTableLoadingItemsSource from '!!raw-loader!./listing_table_loading_items'; // eslint-disable-line import/default
const listingTableLoadingItemsHtml = renderToHtml(ListingTableLoadingItems);

export default (props) => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Table"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: tableSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: tableHtml,
        },
      ]}
    >
      <GuideText>Here&rsquo;s the basic Table. You can expand and collapse rows.</GuideText>

      <GuideDemo>
        <Table />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Fluid Table"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: fluidTableSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: fluidTableHtml,
        },
      ]}
    >
      <GuideText>
        For when you want the content of a table&rsquo;s cells to determine its width.
      </GuideText>

      <GuideDemo>
        <FluidTable />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Table with MenuButtons"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: tableWithMenuButtonsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: tableWithMenuButtonsHtml,
        },
      ]}
    >
      <GuideDemo>
        <TableWithMenuButtons />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ListingTable"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: listingTableSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: listingTableHtml,
        },
      ]}
    >
      <GuideDemo>
        <ListingTable />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ListingTable with loading items"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: listingTableLoadingItemsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: listingTableLoadingItemsHtml,
        },
      ]}
    >
      <GuideDemo>
        <ListingTableLoadingItems />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ListingTable with no items"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: listingTableWithNoItemsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: listingTableWithNoItemsHtml,
        },
      ]}
    >
      <GuideDemo>
        <ListingTableWithNoItems />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ListingTable with EmptyTablePrompt"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: listingTableWithEmptyPromptSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: listingTableWithEmptyPromptHtml,
        },
      ]}
    >
      <GuideDemo>
        <ListingTableWithEmptyPrompt />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

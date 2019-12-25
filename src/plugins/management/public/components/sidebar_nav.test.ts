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

import { IndexedArray } from '../../../../legacy/ui/public/indexed_array';
import { mergeLegacyItems } from '../components/sidebar_nav';

const toIndexedArray = (initialSet: any[]) =>
  new IndexedArray({
    index: ['id'],
    order: ['order'],
    initialSet,
  });

const activeProps = { visible: true, disabled: false };
const disabledProps = { visible: true, disabled: true };
const notVisibleProps = { visible: false, disabled: false };
const visibleItem = { display: 'item', id: 'item', ...activeProps };

const notVisibleSection = {
  display: 'Not visible',
  id: 'not-visible',
  visibleItems: toIndexedArray([visibleItem]),
  ...notVisibleProps,
};
const disabledSection = {
  display: 'Disabled',
  id: 'disabled',
  visibleItems: toIndexedArray([visibleItem]),
  ...disabledProps,
};
const noItemsSection = {
  display: 'No items',
  id: 'no-items',
  visibleItems: toIndexedArray([]),
  ...activeProps,
};
const noActiveItemsSection = {
  display: 'No active items',
  id: 'no-active-items',
  visibleItems: toIndexedArray([
    { display: 'disabled', id: 'disabled', ...disabledProps },
    { display: 'notVisible', id: 'notVisible', ...notVisibleProps },
  ]),
  ...activeProps,
};
const activeSection = {
  display: 'activeSection',
  id: 'activeSection',
  visibleItems: toIndexedArray([visibleItem]),
  ...activeProps,
};

const managementSections = [
  notVisibleSection,
  disabledSection,
  noItemsSection,
  noActiveItemsSection,
  activeSection,
];

describe('Management', () => {
  it('maps legacy sections and apps into SidebarNav items', () => {
    expect(mergeLegacyItems([], managementSections, 'active-item-id')).toMatchSnapshot();
  });
});

// todo - itetrate through various inputs and test outputs

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

import chrome from 'ui/chrome';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

import histogramVisTypeProvider from './histogram';
import lineVisTypeProvider from './line';
import pieVisTypeProvider from './pie';
import areaVisTypeProvider from './area';
import heatmapVisTypeProvider from './heatmap';
import horizontalBarVisTypeProvider from './horizontal_bar';
import gaugeVisTypeProvider from './gauge';
import goalVisTypeProvider from './goal';

async function registerItems() {
  const $injector = await chrome.dangerouslyGetActiveInjector();
  const Private = $injector.get('Private');

  VisTypesRegistryProvider.add(histogramVisTypeProvider(Private));
  VisTypesRegistryProvider.add(lineVisTypeProvider(Private));
  VisTypesRegistryProvider.add(pieVisTypeProvider(Private));
  VisTypesRegistryProvider.add(areaVisTypeProvider(Private));
  VisTypesRegistryProvider.add(heatmapVisTypeProvider(Private));
  VisTypesRegistryProvider.add(horizontalBarVisTypeProvider(Private));
  VisTypesRegistryProvider.add(gaugeVisTypeProvider(Private));
  VisTypesRegistryProvider.add(goalVisTypeProvider(Private));
}

registerItems();

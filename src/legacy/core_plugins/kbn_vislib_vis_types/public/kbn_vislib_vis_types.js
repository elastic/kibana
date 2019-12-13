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

import { setup as visualizations } from '../../visualizations/public/np_ready/public/legacy';

import { histogramDefinition } from './histogram';
import { lineDefinition } from './line';
import { pieDefinition } from './pie';
import { areaDefinition } from './area';
import { heatmapDefinition } from './heatmap';
import { horizontalBarDefinition } from './horizontal_bar';
import { gaugeDefinition } from './gauge';
import { goalDefinition } from './goal';

visualizations.types.createBaseVisualization(histogramDefinition);
visualizations.types.createBaseVisualization(lineDefinition);
visualizations.types.createBaseVisualization(pieDefinition);
visualizations.types.createBaseVisualization(areaDefinition);
visualizations.types.createBaseVisualization(heatmapDefinition);
visualizations.types.createBaseVisualization(horizontalBarDefinition);
visualizations.types.createBaseVisualization(gaugeDefinition);
visualizations.types.createBaseVisualization(goalDefinition);

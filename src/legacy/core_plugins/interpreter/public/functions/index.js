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

import { esaggs } from './esaggs';
import { kibana } from './kibana';
import { kibanaContext } from './kibana_context';
import { vega } from './vega';
import { timelionVis } from './timelion_vis';
import { tsvb } from './tsvb';
import { kibanaMarkdown } from './markdown';
import { inputControlVis } from './input_control';
import { metric } from './metric';
import { kibanaPie } from './pie';
import { regionmap } from './regionmap';
import { tilemap } from './tilemap';
import { kibanaTable } from './table';
import { tagcloud } from './tagcloud';
import { vislib } from './vislib';
import { visualization } from './visualization';

export const functions = [
  esaggs, kibana, kibanaContext, vega, timelionVis, tsvb, kibanaMarkdown, inputControlVis,
  metric, kibanaPie, regionmap, tilemap, kibanaTable, tagcloud, vislib, visualization
];

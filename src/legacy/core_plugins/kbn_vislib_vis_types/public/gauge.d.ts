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

import { ColorSchemas } from 'ui/vislib/components/color/colormaps';
import { Alignments, GaugeTypes } from './utils/collections';

export interface GaugeVisParams {
  readonly type: 'gauge';
  addTooltip: boolean;
  addLegend: boolean;
  isDisplayWarning: boolean;
  gauge: {
    readonly backStyle: 'Full';
    readonly gaugeStyle: 'Full';
    readonly orientation: 'vertical';
    readonly type: 'meter';
    alignment: Alignments;
    colorsRange: Array<{ from?: number; to?: number }>;
    colorSchema: ColorSchemas;
    extendRange: boolean;
    invertColors: boolean;
    gaugeType: GaugeTypes;
    labels: {
      show: boolean;
    };
    minAngle?: number;
    maxAngle?: number;
    percentageMode: boolean;
    scale: {
      show: boolean;
      readonly labels: false;
      readonly color: 'rgba(105,112,125,0.2)';
    };
    style: {
      subText: string;
    };
  };
}

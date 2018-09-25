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

import { elasticLogo } from '../../elastic_logo';

export const fontStyle = {
  type: 'style',
  spec: {
    fontFamily: 'Chalkboard, serif',
    fontWeight: 'bolder',
    fontStyle: 'normal',
    textDecoration: 'underline',
    color: 'pink',
    textAlign: 'center',
    fontSize: '14px',
    lineHeight: '21px',
  },
  css: 'font-family:Chalkboard, serif;font-weight:bolder;font-style:normal;' +
    'text-decoration:underline;color:pink;text-align:center;font-size:14px;line-height:21px',
};

export const containerStyle = {
  type: 'containerStyle',
  border: '3px dotted blue',
  borderRadius: '5px',
  padding: '10px',
  backgroundColor: 'red',
  backgroundImage: `url(${elasticLogo})`,
  opacity: 0.5,
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
};

export const defaultStyle = {
  type: 'seriesStyle',
  label: null,
  color: null,
  lines: 0,
  bars: 0,
  points: 3,
  fill: false,
  stack: undefined,
  horizontalBars: true,
};

export const seriesStyle = {
  type: 'seriesStyle',
  label: 'product1',
  color: 'blue',
  lines: 0,
  bars: 0,
  points: 5,
  fill: true,
  stack: 1,
  horizontalBars: true,
};

export const grayscalePalette = {
  type: 'palette',
  colors: ['#FFFFFF', '#888888', '#000000'],
  gradient: false,
};

export const gradientPalette = {
  type: 'palette',
  colors: ['#FFFFFF', '#000000'],
  gradient: true,
};

export const xAxisConfig = {
  type: 'axisConfig',
  show: true,
  position: 'top',
};

export const yAxisConfig = {
  type: 'axisConfig',
  show: true,
  position: 'right',
};

export const hideAxis = {
  type: 'axisConfig',
  show: false,
  position: 'right',
};

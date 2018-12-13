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

export default {
  lineColor: 'rgba(0,0,0,0.2)',
  lineColorReversed: 'rgba(255,255,255,0.4)',
  textColor: 'rgba(0,0,0,0.4)',
  textColorReversed: 'rgba(255,255,255,0.6)',
  valueColor: 'rgba(0,0,0,0.7)',
  valueColorReversed: 'rgba(255,255,255,0.8)'
};

const RGBA_REGEX = /^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i;

export function convertRgb2Hex(rgb) {
  rgb = rgb.match(RGBA_REGEX);
  return (rgb && rgb.length === 4) ? '#' +
    ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
    ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
    ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : undefined;
}

export function isRgbColor(color) {
  return color.match(RGBA_REGEX) !== null;
}

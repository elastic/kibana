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

export const intervalOptions = [
  {
    display: 'Auto',
    val: 'auto',
    enabled: function (agg) {
      // not only do we need a time field, but the selected field needs
      // to be the time field. (see #3028)
      return agg.fieldIsTimeField();
    }
  },
  {
    display: 'Millisecond',
    val: 'ms'
  },
  {
    display: 'Second',
    val: 's'
  },
  {
    display: 'Minute',
    val: 'm'
  },
  {
    display: 'Hourly',
    val: 'h'
  },
  {
    display: 'Daily',
    val: 'd'
  },
  {
    display: 'Weekly',
    val: 'w'
  },
  {
    display: 'Monthly',
    val: 'M'
  },
  {
    display: 'Yearly',
    val: 'y'
  },
  {
    display: 'Custom',
    val: 'custom'
  }
];

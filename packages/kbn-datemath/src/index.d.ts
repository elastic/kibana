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

import moment from 'moment';
export type FixedUnit = 'ms';
export type MixedUnit = 's' | 'm' | 'h' | 'd';
export type CalendarUnit = 'w' | 'M' | 'y';
export type Unit = FixedUnit | MixedUnit | CalendarUnit;

interface FixedUnitInfo {
  weight: number;
  type: 'fixed';
  base: number;
}

interface MixedUnitInfo {
  weight: number;
  type: 'mixed';
  base: number;
}

interface CalendarUnitInfo {
  weight: number;
  type: 'calendar';
}

declare const datemath: {
  unitsMap: { [k in FixedUnit]: FixedUnitInfo } &
    { [k in MixedUnit]: MixedUnitInfo } &
    { [k in CalendarUnit]: CalendarUnitInfo };
  units: Unit[];
  unitsAsc: Unit[];
  unitsDesc: Unit[];

  parse(
    input: string,
    options?: {
      roundUp?: boolean;
      forceNow?: boolean;
      momentInstance?: typeof moment;
    }
  ): moment.Moment | undefined;
};

export default datemath;

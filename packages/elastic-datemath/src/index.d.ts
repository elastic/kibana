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
export type Unit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

declare const datemath: {
  unitsMap: {
    [k in Unit]: {
      weight: number;
      type: 'calendar' | 'fixed' | 'mixed';
      base: number;
    }
  };
  units: Unit[];
  unitsAsc: Unit[];
  unitsDesc: Unit[];

  /**
   * Parses a string into a moment object. The string can be something like "now - 15m".
   * @param options.forceNow If this optional parameter is supplied, "now" will be treated as this
   * date, rather than the real "now".
   */
  parse(
    input: string,
    options?: {
      roundUp?: boolean;
      forceNow?: Date;
      momentInstance?: typeof moment;
    }
  ): moment.Moment | undefined;
};

// eslint-disable-next-line import/no-default-export
export default datemath;

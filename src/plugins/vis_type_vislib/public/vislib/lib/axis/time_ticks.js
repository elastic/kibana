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

export const timeTicks = scale => {
  // on a time domain shift it to have the buckets start at nice points in time (e.g. at the start of the day) in UTC
  // then shift the calculated tick positions back into the real domain to have a nice tick position in the actual
  // time zone. This is necessary because the d3 time scale doesn't provide a function to get nice time positions in
  // a configurable time zone directly.
  const domain = scale.domain();
  const startOffset = moment(domain[0]).utcOffset();
  const shiftedDomain = domain.map(val => moment(val).add(startOffset, 'minute'));
  const tickScale = scale.copy().domain(shiftedDomain);
  return n => {
    const ticks = tickScale.ticks(n);
    const timePerTick = (domain[1] - domain[0]) / ticks.length;
    const hourTicks = timePerTick < 1000 * 60 * 60 * 12;

    return ticks.map(d => {
      // To get a nice date for the tick, we have to shift the offset of the current UTC tick. This is
      // relevant in cases where the domain spans various DSTs.
      // However if there are multiple ticks per day, this would cause a gap because the ticks are placed
      // in UTC which doesn't have DST. In this case, always shift by the offset of the beginning of the domain.
      const currentOffset = moment(d).utcOffset();
      return moment(d)
        .subtract(hourTicks ? startOffset : currentOffset, 'minute')
        .valueOf();
    });
  };
};

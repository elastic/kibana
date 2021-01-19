/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';
export type Unit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

declare const datemath: {
  unitsMap: {
    [k in Unit]: {
      weight: number;
      type: 'calendar' | 'fixed' | 'mixed';
      base: number;
    };
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

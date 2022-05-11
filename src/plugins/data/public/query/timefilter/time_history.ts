/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { PublicMethodsOf } from '@kbn/utility-types';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { PersistedLog } from '../persisted_log';
import { TimeRange } from '../../../common';

export class TimeHistory {
  private history: PersistedLog<TimeRange>;

  constructor(storage: IStorageWrapper) {
    const historyOptions = {
      maxLength: 10,
      filterDuplicates: true,
      isDuplicate: (oldItem: TimeRange, newItem: TimeRange) => {
        return oldItem.from === newItem.from && oldItem.to === newItem.to;
      },
    };
    this.history = new PersistedLog('kibana.timepicker.timeHistory', historyOptions, storage);
  }

  add(time: TimeRange) {
    if (!time || !time.from || !time.to) {
      return;
    }

    // time from/to can be strings or moment objects - convert to strings so always dealing with same types
    const justStringsTime = {
      from: moment.isMoment(time.from) ? time.from.toISOString() : time.from,
      to: moment.isMoment(time.to) ? time.to.toISOString() : time.to,
    };
    this.history.add(justStringsTime);
  }

  get() {
    return this.history.get();
  }

  get$() {
    return this.history.get$();
  }
}

export type TimeHistoryContract = PublicMethodsOf<TimeHistory>;

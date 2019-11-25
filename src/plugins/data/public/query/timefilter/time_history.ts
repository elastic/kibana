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
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
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
}

export type TimeHistoryContract = PublicMethodsOf<TimeHistory>;

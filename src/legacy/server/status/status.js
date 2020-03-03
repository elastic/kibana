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

import * as states from './states';
import { EventEmitter } from 'events';

export default class Status extends EventEmitter {
  constructor(id, server) {
    super();

    if (!id || typeof id !== 'string') {
      throw new TypeError('Status constructor requires an `id` string');
    }

    this.id = id;
    this.since = new Date();
    this.state = 'uninitialized';
    this.message = 'uninitialized';

    this.on('change', function(previous, previousMsg) {
      this.since = new Date();

      const tags = ['status', this.id, this.state === 'red' ? 'error' : 'info'];

      server.logWithMetadata(
        tags,
        `Status changed from ${previous} to ${this.state}${
          this.message ? ' - ' + this.message : ''
        }`,
        {
          state: this.state,
          message: this.message,
          prevState: previous,
          prevMsg: previousMsg,
        }
      );
    });
  }

  toJSON() {
    return {
      id: this.id,
      state: this.state,
      icon: states.get(this.state).icon,
      message: this.message,
      uiColor: states.get(this.state).uiColor,
      since: this.since,
    };
  }

  on(eventName, handler) {
    super.on(eventName, handler);

    if (eventName === this.state) {
      setImmediate(() => handler(this.state, this.message));
    }
  }

  once(eventName, handler) {
    if (eventName === this.state) {
      setImmediate(() => handler(this.state, this.message));
    } else {
      super.once(eventName, handler);
    }
  }
}

states.getAll().forEach(function(state) {
  Status.prototype[state.id] = function(message) {
    if (this.state === 'disabled') return;

    const previous = this.state;
    const previousMsg = this.message;

    this.error = null;
    this.message = message || state.title;
    this.state = state.id;

    if (message instanceof Error) {
      this.error = message;
      this.message = message.message;
    }

    if (previous === this.state && previousMsg === this.message) {
      // noop
      return;
    }

    this.emit(state.id, previous, previousMsg, this.state, this.message);
    this.emit('change', previous, previousMsg, this.state, this.message);
  };
});

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

import $ from 'jquery';
import _ from 'lodash';
import Bluebird from 'bluebird';
import { keyMap } from 'ui/directives/key_map';
const reverseKeyMap = _.mapValues(_.invert(keyMap), _.ary(_.parseInt, 1));

/**
 * Simulate keyboard events in an element. This allows testing the way that
 * elements respond to keyboard input.
 *
 * # sequence style
 * keyboard events occur in a sequence, this array of events describe that sequence.
 *
 * ## event
 * an object with a type property, or a string which will be turned into a single press
 *
 * ## event types
 * ### press
 * represents a key press
 *   - `key`: the key for the button pressed
 *   - `events`: optional list of events that occur before this press completes
 *
 * ### wait
 * represents a pause in a sequence
 *   - `ms`: the number of milliseconds that the pause takes
 *
 * ### repeat
 * represents a key being repeated because it is held down. Should only exist as a
 * sub event of `press` events.
 *   - `count`: the number of times the repeat occurs
 *
 * @param  {element} $el - jQuery element where events should occur
 * @param  {[type]} sequence - an array of events
 * @async
 */
export default function ($el, sequence) {
  const modifierState = {
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
  };

  return doList(_.clone(sequence));

  function setModifier(key, state) {
    const name = key + 'Key';
    if (modifierState.hasOwnProperty(name)) {
      modifierState[name] = !!state;
    }
  }

  function doList(list) {
    return Bluebird.try(function () {
      if (!list || !list.length) return;

      let event = list[0];
      if (_.isString(event)) {
        event = { type: 'press', key: event };
      }

      switch (event.type) {
        case 'press':
          return Bluebird.resolve()
            .then(_.partial(fire, 'keydown', event.key))
            .then(_.partial(fire, 'keypress', event.key))
            .then(_.partial(doList, event.events))
            .then(_.partial(fire, 'keyup', event.key));

        case 'wait':
          return Bluebird.delay(event.ms);

        case 'repeat':
          return (function again(remaining) {
            if (!remaining) return Bluebird.resolve();
            remaining = remaining - 1;
            return Bluebird.resolve()
              .then(_.partial(fire, 'keydown', event.key, true))
              .then(_.partial(fire, 'keypress', event.key, true))
              .then(_.partial(again, remaining));
          })(event.count);

        default:
          throw new TypeError('invalid event type "' + event.type + '"');
      }
    }).then(function () {
      if (_.size(list) > 1) return doList(list.slice(1));
    });
  }

  function fire(type, key) {
    const keyCode = reverseKeyMap[key];
    if (!keyCode) throw new TypeError('invalid key "' + key + '"');

    if (type === 'keydown') setModifier(key, true);
    if (type === 'keyup') setModifier(key, false);

    const $target = _.isFunction($el) ? $el() : $el;
    const $event = new $.Event(type, _.defaults({ keyCode: keyCode }, modifierState));
    $target.trigger($event);
  }
}

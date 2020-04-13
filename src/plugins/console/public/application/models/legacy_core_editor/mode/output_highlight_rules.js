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

const ace = require('brace');
import 'brace/mode/json';
import { addXJsonToRules } from '../../../../../../es_ui_shared/public';

const oop = ace.acequire('ace/lib/oop');
const JsonHighlightRules = ace.acequire('ace/mode/json_highlight_rules').JsonHighlightRules;

export function OutputJsonHighlightRules() {
  this.$rules = {};

  addXJsonToRules(this, 'start');

  this.$rules.start.unshift(
    {
      token: 'warning',
      regex: '#!.*$',
    },
    {
      token: 'comment',
      regex: '#.*$',
    }
  );

  if (this.constructor === OutputJsonHighlightRules) {
    this.normalizeRules();
  }
}

oop.inherits(OutputJsonHighlightRules, JsonHighlightRules);

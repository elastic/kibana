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

import 'uiExports/interpreter';
import { register, registryFactory } from '@kbn/interpreter/common';
import { initializeInterpreter } from './lib/interpreter';
import { registries } from './registries';
import { kfetch } from 'ui/kfetch';
import { ajaxStream } from 'ui/ajax_stream';
import { functions } from './functions';
import { visualization } from './renderers/visualization';
import { typeSpecs } from '../common/types';

// Expose kbnInterpreter.register(specs) and kbnInterpreter.registries() globally so that plugins
// can register without a transpile step.
global.kbnInterpreter = Object.assign(global.kbnInterpreter || {}, registryFactory(registries));

register(registries, {
  types: typeSpecs,
  browserFunctions: functions,
  renderers: [visualization],
});

let _resolve;
let _interpreterPromise;

const initialize = async () => {
  initializeInterpreter({
    kfetch,
    ajaxStream,
    typesRegistry: registries.types,
    functionsRegistry: registries.browserFunctions,
  }).then(interpreter => {
    _resolve({ interpreter });
  });
};

export const getInterpreter = async () => {
  if (!_interpreterPromise) {
    _interpreterPromise = new Promise(resolve => _resolve = resolve);
    initialize();
  }
  return await _interpreterPromise;
};

export const interpretAst = async (...params) => {
  const { interpreter } = await getInterpreter();
  return await interpreter.interpretAst(...params);
};

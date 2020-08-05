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

import { Plugin, CoreSetup, CoreStart } from 'kibana/server';
import { todoSavedObject } from './todo_saved_object';
import { bookSavedObject } from './book_saved_object';

export class EmbeddableExamplesPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.savedObjects.registerType(todoSavedObject);
    core.savedObjects.registerType(bookSavedObject);
  }

  public start(core: CoreStart) {}

  public stop() {}
}

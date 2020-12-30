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

/*
@TODO

The brace/mode/json import below is loaded eagerly - before this plugin is explicitly loaded by users. This makes
the brace JSON mode, used for JSON syntax highlighting and grammar checking, available across all of Kibana plugins.

This is not ideal because we are loading JS that is not necessary for Kibana to start, but the alternative
is breaking JSON mode for an unknown number of ace editors across Kibana - not all components reference the underlying
EuiCodeEditor (for instance, explicitly).

Importing here is a way of preventing a more sophisticated solution to this problem since we want to, eventually,
migrate all code editors over to Monaco. Once that is done, we should remove this import.
 */
import 'brace/mode/json';

export * from './field';
export * from './form_row';
export * from './fields';

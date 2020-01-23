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

/**
 * Static legacy code which hasn't been moved to this plugin yet, but
 * should be eventually.
 *
 * @public
 */
// @ts-ignore Used only by tsvb, vega, input control vis
export { defaultFeedbackMessage } from 'ui/vis/default_feedback_message';
// @ts-ignore
export { DefaultEditorSize } from 'ui/vis/editor_size';

/**
 * Static np-ready code, re-exported here so consumers can import from
 * `src/legacy/core_plugins/visualizations/public`
 *
 * @public
 */
export * from './np_ready/public';

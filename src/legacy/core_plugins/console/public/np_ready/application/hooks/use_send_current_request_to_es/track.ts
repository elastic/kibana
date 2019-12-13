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

import { Metrics } from '../../../../legacy';
import { SenseEditor } from '../../models/sense_editor';
import { getEndpointFromPosition } from '../../../lib/autocomplete/autocomplete';

export const track = (
  requests: any[],
  editor: SenseEditor,
  trackUiMetric: Metrics['trackUiMetric'],
  type: Metrics['METRIC_TYPE']['COUNT']
) => {
  // `getEndpointFromPosition` gets values from the server-side generated JSON files which
  // are a combination of JS, automatically generated JSON and manual overrides. That means
  // the metrics reported from here will be tied to the definitions in those files.
  // See src/legacy/core_plugins/console/server/api_server/spec
  const endpointDescription = getEndpointFromPosition(
    editor,
    editor.getCoreEditor().getCurrentPosition(),
    editor.parser
  );

  if (endpointDescription) {
    const eventName = `${requests[0]?.method ?? ''} ${endpointDescription.patterns?.join('|') ??
      'no pattern found'}`;
    trackUiMetric(type, eventName);
  }
};

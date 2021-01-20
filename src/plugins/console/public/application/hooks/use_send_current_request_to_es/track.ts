/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SenseEditor } from '../../models/sense_editor';
import { getEndpointFromPosition } from '../../../lib/autocomplete/get_endpoint_from_position';
import { MetricsTracker } from '../../../types';

export const track = (requests: any[], editor: SenseEditor, trackUiMetric: MetricsTracker) => {
  const coreEditor = editor.getCoreEditor();
  // `getEndpointFromPosition` gets values from the server-side generated JSON files which
  // are a combination of JS, automatically generated JSON and manual overrides. That means
  // the metrics reported from here will be tied to the definitions in those files.
  // See src/legacy/core_plugins/console/server/api_server/spec
  const endpointDescription = getEndpointFromPosition(
    coreEditor,
    coreEditor.getCurrentPosition(),
    editor.parser
  );

  if (requests[0] && endpointDescription) {
    const eventName = `${requests[0].method}_${endpointDescription.id ?? 'unknown'}`;
    trackUiMetric.count(eventName);
  }
};

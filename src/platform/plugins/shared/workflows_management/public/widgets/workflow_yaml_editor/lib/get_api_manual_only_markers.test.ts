/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { getApiManualOnlyMarkers } from './use_yaml_validation';

describe('getApiManualOnlyMarkers', () => {
  const dummyModel = {
    getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
  } as unknown as Pick<monaco.editor.ITextModel, 'getPositionAt'>;

  it('returns marker when non-manual trigger and elasticsearch.request step present', () => {
    const workflow = {
      triggers: [{ type: 'triggers.elastic.schedule' }],
      steps: [{ name: 'es', type: 'elasticsearch.request' }],
    };
    const text = 'name: es';
    const markers = getApiManualOnlyMarkers(workflow, text, dummyModel);
    expect(markers.some((m) => m.source === 'api-steps-manual-only')).toBe(true);
  });

  it('returns no marker when only manual trigger is present', () => {
    const workflow = {
      triggers: [{ type: 'triggers.elastic.manual' }],
      steps: [{ name: 'es', type: 'elasticsearch.request' }],
    };
    const text = 'name: es';
    const markers = getApiManualOnlyMarkers(workflow, text, dummyModel);
    expect(markers.some((m) => m.source === 'api-steps-manual-only')).toBe(false);
  });

  it('returns marker for kibana.request step with non-manual trigger', () => {
    const workflow = {
      triggers: [{ type: 'triggers.elastic.schedule' }],
      steps: [{ name: 'kbn', type: 'kibana.request' }],
    };
    const text = 'name: kbn';
    const markers = getApiManualOnlyMarkers(workflow, text, dummyModel);
    expect(markers.some((m) => m.source === 'api-steps-manual-only')).toBe(true);
  });
});

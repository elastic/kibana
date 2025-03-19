/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VisualizationSavedObject } from '../../common/content_management';
import { registerReadOnlyVisType } from './read_only_vis_type_registry';
import { getInAppUrl } from './get_in_app_url';

registerReadOnlyVisType('myLegacyVis');

test('should return visualize edit url', () => {
  const obj = {
    id: '1',
    attributes: {
      visState: JSON.stringify({ type: 'vega' }),
    },
  } as unknown as VisualizationSavedObject;
  expect(getInAppUrl(obj)).toEqual({
    path: '/app/visualize#/edit/1',
    uiCapabilitiesPath: 'visualize_v2.show',
  });
});

test('should return undefined when visualization type is read only', () => {
  const obj = {
    id: '1',
    attributes: {
      visState: JSON.stringify({ type: 'myLegacyVis' }),
    },
  } as unknown as VisualizationSavedObject;
  expect(getInAppUrl(obj)).toBeUndefined();
});

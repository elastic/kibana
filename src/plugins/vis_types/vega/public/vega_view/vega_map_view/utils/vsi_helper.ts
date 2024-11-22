/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-expect-error
import Vsi from 'vega-spec-injector';

import { Spec } from 'vega';
import { defaultProjection } from '../constants';

export const injectMapPropsIntoSpec = (spec: Spec) => {
  const vsi = new Vsi();

  vsi.overrideField(spec, 'autosize', 'none');
  vsi.addToList(spec, 'signals', ['zoom', 'latitude', 'longitude']);
  vsi.addToList(spec, 'projections', [defaultProjection]);

  return spec;
};

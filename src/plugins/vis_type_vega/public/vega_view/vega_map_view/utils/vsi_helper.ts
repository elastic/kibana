/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-expect-error
// eslint-disable-next-line import/no-extraneous-dependencies
import Vsi from 'vega-spec-injector';

import { VegaSpec } from '../../../data_model/types';
import { defaultProjection } from '../constants';

export const injectMapPropsIntoSpec = (spec: VegaSpec) => {
  const vsi = new Vsi();

  vsi.overrideField(spec, 'autosize', 'none');
  vsi.addToList(spec, 'signals', ['zoom', 'latitude', 'longitude']);
  vsi.addToList(spec, 'projections', [defaultProjection]);

  return spec;
};

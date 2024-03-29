/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type HasType, apiIsOfType } from '@kbn/presentation-publishing';
import { VisParams } from '../../types';
import Vis from '../../vis';

export type HasVisualizeConfig = HasType<'visualization'> & {
  getVis: () => Vis<VisParams>;
};

export const apiHasVisualizeConfig = (api: unknown): api is HasVisualizeConfig => {
  return Boolean(
    api &&
      apiIsOfType(api, 'visualization') &&
      typeof (api as HasVisualizeConfig).getVis === 'function'
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HasType } from '@kbn/presentation-publishing';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import type { VisParams } from '../../types';
import type Vis from '../../vis';

export type HasVisualizeConfig = HasType<typeof VISUALIZE_EMBEDDABLE_TYPE> & {
  getVis: () => Vis<VisParams>;
  getExpressionVariables?: () => Record<string, unknown> | undefined;
};

export const apiHasVisualizeConfig = (api: unknown): api is HasVisualizeConfig => {
  return Boolean(
    api &&
      (api as HasType)?.type === VISUALIZE_EMBEDDABLE_TYPE &&
      typeof (api as HasVisualizeConfig).getVis === 'function'
  );
};

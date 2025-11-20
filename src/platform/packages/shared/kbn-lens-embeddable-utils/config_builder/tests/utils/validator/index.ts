/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gaugeStateSchema } from '../../../schema/charts/gauge';
import { tagcloudStateSchema } from '../../../schema/charts/tagcloud';
import { metricStateSchema } from '../../../schema/charts/metric';
import { legacyMetricStateSchema } from '../../../schema/charts/legacy_metric';
import * as canonicalizers from './canonicalizers';
import { validateTransformsFn } from './validate_transforms';
import type { ValidateTransform } from './types';

export const validator = {
  gauge: validateTransformsFn(gaugeStateSchema, canonicalizers.gauge),
  tagcloud: validateTransformsFn(tagcloudStateSchema, canonicalizers.tagcloud),
  metric: validateTransformsFn(metricStateSchema, canonicalizers.metric),
  legacyMetric: validateTransformsFn(legacyMetricStateSchema, canonicalizers.legacyMetric),
} satisfies Record<string, ValidateTransform>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { RangeSliderControlState } from '@kbn/controls-schemas';
import type { DataControlApi } from '../types';

export type RangeSliderControlApi = DefaultEmbeddableApi<RangeSliderControlState> &
  DataControlApi & {
    clearSelections: () => void;
    hasSelections$: PublishingSubject<boolean | undefined>;
  };

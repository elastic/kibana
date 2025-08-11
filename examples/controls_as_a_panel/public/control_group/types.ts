/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { CanAddNewPanel } from '@kbn/presentation-containers';
import {
  HasEditCapabilities,
  PublishesUnsavedChanges,
  SerializedTitles,
} from '@kbn/presentation-publishing';

export interface ControlGroupAttributes {
  controls: {
    [key: string]: { type: 'optionsList' | 'rangeSlider' };
  };
}

export type ControlGroupSerializedState = SerializedTitles & { attributes: ControlGroupAttributes };

export type ControlGroupRuntimeState = SerializedTitles & ControlGroupAttributes;

export type ControlGroupApi = DefaultEmbeddableApi<ControlGroupSerializedState> &
  HasEditCapabilities &
  CanAddNewPanel &
  PublishesUnsavedChanges;

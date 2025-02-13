/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PanelState,
  EmbeddableInput,
  SavedObjectEmbeddableInput,
} from '@kbn/embeddable-plugin/common';
import type { Reference } from '@kbn/content-management-utils';

import type { GridData } from '../../server/content_management';

export interface DashboardPanelMap {
  [key: string]: DashboardPanelState;
}

export interface DashboardPanelState<
  TEmbeddableInput extends EmbeddableInput | SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
> extends PanelState<TEmbeddableInput> {
  readonly gridData: GridData;
  panelRefName?: string;

  /**
   * This version key was used to store Kibana version information from versions 7.3.0 -> 8.11.0.
   * As of version 8.11.0, the versioning information is now per-embeddable-type and is stored on the
   * embeddable's input. This key is needed for BWC, but its value will be removed on Dashboard save.
   */
  version?: string;
  /**
   * React embeddables are serialized and may pass references that are later used in factory's deserialize method.
   */
  references?: Reference[];
}

export type DashboardContainerByReferenceInput = SavedObjectEmbeddableInput;

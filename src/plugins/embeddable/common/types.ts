/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { KibanaExecutionContext } from 'src/core/public';
import { PersistableStateService, PersistableState } from '../../kibana_utils/common';

export enum ViewMode {
  EDIT = 'edit',
  PREVIEW = 'preview',
  PRINT = 'print',
  VIEW = 'view',
}

export type EmbeddableInput = {
  viewMode?: ViewMode;
  title?: string;
  /**
   * Note this is not a saved object id. It is used to uniquely identify this
   * Embeddable instance from others (e.g. inside a container).  It's possible to
   * have two Embeddables where everything else is the same but the id.
   */
  id: string;
  lastReloadRequestTime?: number;
  hidePanelTitles?: boolean;

  /**
   * Reserved key for enhancements added by other plugins.
   */
  enhancements?: SerializableRecord;

  /**
   * List of action IDs that this embeddable should not render.
   */
  disabledActions?: string[];

  /**
   * Whether this embeddable should not execute triggers.
   */
  disableTriggers?: boolean;

  /**
   * Search session id to group searches
   */
  searchSessionId?: string;

  /**
   * Flag whether colors should be synced with other panels
   */
  syncColors?: boolean;

  executionContext?: KibanaExecutionContext;
};

export interface PanelState<E extends EmbeddableInput & { id: string } = { id: string }> {
  // The type of embeddable in this panel. Will be used to find the factory in which to
  // load the embeddable.
  type: string;

  // Stores input for this embeddable that is specific to this embeddable. Other parts of embeddable input
  // will be derived from the container's input. **State in here will override state derived from the container.**
  explicitInput: Partial<E> & { id: string };
}

export type EmbeddableStateWithType = EmbeddableInput & { type: string };

export type EmbeddablePersistableStateService = PersistableStateService<EmbeddableStateWithType>;

export interface CommonEmbeddableStartContract {
  getEmbeddableFactory: (
    embeddableFactoryId: string
  ) => PersistableState & { isContainerType: boolean };
  getEnhancement: (enhancementId: string) => PersistableState;
}

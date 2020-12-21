/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PersistableStateService, SerializableState } from '../../kibana_utils/common';

export enum ViewMode {
  EDIT = 'edit',
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
  enhancements?: SerializableState;

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
};

export interface PanelState<E extends EmbeddableInput & { id: string } = { id: string }> {
  // The type of embeddable in this panel. Will be used to find the factory in which to
  // load the embeddable.
  type: string;

  // Stores input for this embeddable that is specific to this embeddable. Other parts of embeddable input
  // will be derived from the container's input. **Any state in here will override any state derived from
  // the container.**
  explicitInput: Partial<E> & { id: string };
}

export type EmbeddableStateWithType = EmbeddableInput & { type: string };

export type EmbeddablePersistableStateService = PersistableStateService<EmbeddableStateWithType>;

export interface CommonEmbeddableStartContract {
  getEmbeddableFactory: (embeddableFactoryId: string) => any;
  getEnhancement: (enhancementId: string) => any;
}

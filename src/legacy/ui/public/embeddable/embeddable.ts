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

import { Adapters } from 'ui/inspector';
import { StaticIndexPattern } from 'ui/index_patterns';
import { ContainerState } from './types';

export interface EmbeddableMetadata {
  /**
   * Should specify any index pattern the embeddable uses. This will be used by the container to list out
   * available fields to filter on.
   */
  indexPatterns?: StaticIndexPattern[];

  /**
   * The title, or name, of the embeddable.
   */
  title?: string;

  /**
   * A url to direct the user for managing the embeddable instance. We may want to eventually make this optional
   * for non-instanced panels that can only be created and deleted but not edited. We also wish to eventually support
   * in-place editing on the dashboard itself, so another option could be to supply an element, or fly out panel, to
   * offer for editing directly on the dashboard.
   */
  editUrl?: string;

  editLabel?: string;

  /**
   * A flag indicating if this embeddable can be edited.
   */
  editable?: boolean;
}

export abstract class Embeddable {
  public readonly metadata: EmbeddableMetadata = {};

  // TODO: Make title and editUrl required and move out of options parameter.
  constructor(metadata: EmbeddableMetadata = {}) {
    this.metadata = metadata || {};
  }

  public onContainerStateChanged(containerState: ContainerState): void {
    return;
  }

  /**
   * Embeddable should render itself at the given domNode.
   */
  public abstract render(domNode: HTMLElement, containerState: ContainerState): void;

  /**
   * An embeddable can return inspector adapters if it want the inspector to be
   * available via the context menu of that panel.
   * @return Inspector adapters that will be used to open an inspector for.
   */
  public getInspectorAdapters(): Adapters | undefined {
    return undefined;
  }

  public destroy(): void {
    return;
  }

  public reload(): void {
    return;
  }
}

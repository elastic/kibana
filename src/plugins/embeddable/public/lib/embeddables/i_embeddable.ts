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

import { Observable } from 'rxjs';
import { Adapters } from '../types';
import { IContainer } from '../containers/i_container';
import { ViewMode } from '../types';

export interface EmbeddableInput {
  viewMode?: ViewMode;
  title?: string;
  id: string;
  lastReloadRequestTime?: number;
  hidePanelTitles?: boolean;
  isEmptyState?: boolean;
  /**
   * List of action IDs that this embeddable should not render.
   */
  disabledActions?: string[];
}

export interface EmbeddableOutput {
  editUrl?: string;
  defaultTitle?: string;
  title?: string;
  editable?: boolean;
  savedObjectId?: string;
}

export interface IEmbeddable<
  I extends EmbeddableInput = EmbeddableInput,
  O extends EmbeddableOutput = EmbeddableOutput
> {
  /**
   * Is this embeddable an instance of a Container class, can it contain
   * nested embeddables?
   **/
  readonly isContainer: boolean;

  /**
   * If this embeddable is nested inside a container, this will contain
   * a reference to its parent.
   **/
  readonly parent?: IContainer;

  /**
   * The type of embeddable, this is what will be used to take a serialized
   * embeddable and find the correct factory for which to create an instance of it.
   **/
  readonly type: string;

  /**
   * A unique identifier for this embeddable. Mainly only used by containers to map their
   * Panel States to a child embeddable instance.
   **/
  readonly id: string;

  /**
   * A functional representation of the isContainer variable, but helpful for typescript to
   * know the shape if this returns true
   */
  getIsContainer(): this is IContainer;

  /**
   * Get the input used to instantiate this embeddable. The input is a serialized representation of
   * this embeddable instance and can be used to clone or re-instantiate it. Input state:
   *
   * - Can be updated externally
   * - Can change multiple times for a single embeddable instance.
   *
   * Examples: title, pie slice colors, custom search columns and sort order.
   **/
  getInput(): Readonly<I>;

  /**
   * Output state is:
   *
   * - State that should not change once the embeddable is instantiated, or
   * - State that is derived from the input state, or
   * - State that only the embeddable instance itself knows about, or the factory.
   *
   * Examples: editUrl, title taken from a saved object, if your input state was first name and
   *   last name, your output state could be greeting.
   **/
  getOutput(): Readonly<O>;

  /**
   * Updates input state with the given changes.
   * @param changes
   */
  updateInput(changes: Partial<I>): void;

  /**
   * Returns an observable which will be notified when input state changes.
   */
  getInput$(): Readonly<Observable<I>>;

  /**
   * Returns an observable which will be notified when output state changes.
   */
  getOutput$(): Readonly<Observable<O>>;

  /**
   * Returns the title of this embeddable.
   */
  getTitle(): string | undefined;

  /**
   * Returns the top most parent embeddable, or itself if this embeddable
   * is not within a parent.
   */
  getRoot(): IEmbeddable | IContainer;

  /**
   * Renders the embeddable at the given node.
   * @param domNode
   */
  render(domNode: HTMLElement | Element): void;

  /**
   * Reload the embeddable so output and rendering is up to date. Especially relevant
   * if the embeddable takes relative time as input (e.g. now to now-15)
   */
  reload(): void;

  /**
   * An embeddable can return inspector adapters if it wants the inspector to be
   * available via the context menu of that panel.
   * @return Inspector adapters that will be used to open an inspector for.
   */
  getInspectorAdapters(): Adapters | undefined;

  /**
   * Cleans up subscriptions, destroy nodes mounted from calls to render.
   */
  destroy(): void;
}

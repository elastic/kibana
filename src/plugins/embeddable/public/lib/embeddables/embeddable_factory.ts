/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectAttributes } from '@kbn/core/public';
import { SavedObjectMetaData } from '@kbn/saved-objects-plugin/public';
import { PersistableState } from '@kbn/kibana-utils-plugin/common';
import { UiActionsPresentableGrouping } from '@kbn/ui-actions-plugin/public';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { ErrorEmbeddable } from './error_embeddable';
import { IContainer } from '../containers/i_container';
import { PropertySpec } from '../types';
import { EmbeddableStateWithType } from '../../../common/types';

export interface EmbeddableInstanceConfiguration {
  id: string;
  savedObjectId?: string;
}

export interface OutputSpec {
  [key: string]: PropertySpec;
}

/**
 * EmbeddableFactories create and initialize an embeddable instance
 */
export interface EmbeddableFactory<
  TEmbeddableInput extends EmbeddableInput = EmbeddableInput,
  TEmbeddableOutput extends EmbeddableOutput = EmbeddableOutput,
  TEmbeddable extends IEmbeddable<TEmbeddableInput, TEmbeddableOutput> = IEmbeddable<
    TEmbeddableInput,
    TEmbeddableOutput
  >,
  TSavedObjectAttributes extends SavedObjectAttributes = SavedObjectAttributes
> extends PersistableState<EmbeddableStateWithType> {
  // A unique identified for this factory, which will be used to map an embeddable spec to
  // a factory that can generate an instance of it.
  readonly type: string;

  /**
   * Returns whether the current user should be allowed to edit this type of
   * embeddable. Most of the time this should be based off the capabilities service, hence it's async.
   */
  readonly isEditable: () => Promise<boolean>;

  readonly savedObjectMetaData?: SavedObjectMetaData<TSavedObjectAttributes>;

  /**
   * Indicates the grouping this factory should appear in a sub-menu. Example, this is used for grouping
   * options in the editors menu in Dashboard for creating new embeddables
   */
  readonly grouping?: UiActionsPresentableGrouping;

  /**
   * True if is this factory create embeddables that are Containers. Used in the add panel to
   * conditionally show whether these can be added to another container. It's just not
   * supported right now, but once nested containers are officially supported we can probably get
   * rid of this interface.
   */
  readonly isContainerType: boolean;

  /**
   * Returns a display name for this type of embeddable. Used in "Create new... " options
   * in the add panel for containers.
   */
  getDisplayName(): string;

  /**
   * Returns an EUI Icon type to be displayed in a menu.
   */
  getIconType(): string;

  /**
   * Returns a description about the embeddable.
   */
  getDescription(): string;

  /**
   * If false, this type of embeddable can't be created with the "createNew" functionality. Instead,
   * use createFromSavedObject, where an existing saved object must first exist.
   */
  canCreateNew(): boolean;

  /**
   * Can be used to get the default input, to be passed in to during the creation process. Default
   * input will not be stored in a parent container, so all inherited input from a container will trump
   * default input parameters.
   * @param partial
   */
  getDefaultInput(partial: Partial<TEmbeddableInput>): Partial<TEmbeddableInput>;

  /**
   * Can be used to request explicit input from the user, to be passed in to `EmbeddableFactory:create`.
   * Explicit input is stored on the parent container for this embeddable. It overrides all inherited
   * input passed down from the parent container.
   */
  getExplicitInput(): Promise<Partial<TEmbeddableInput>>;

  /**
   * Creates a new embeddable instance based off the saved object id.
   * @param savedObjectId
   * @param input - some input may come from a parent, or user, if it's not stored with the saved object. For example, the time
   * range of the parent container.
   * @param parent
   */
  createFromSavedObject(
    savedObjectId: string,
    input: Partial<TEmbeddableInput>,
    parent?: IContainer
  ): Promise<TEmbeddable | ErrorEmbeddable>;

  /**
   * Resolves to undefined if a new Embeddable cannot be directly created and the user will instead be redirected
   * elsewhere.
   *
   * This will likely change in future iterations when we improve in place editing capabilities.
   */
  create(
    initialInput: TEmbeddableInput,
    parent?: IContainer
  ): Promise<TEmbeddable | ErrorEmbeddable | undefined>;
}

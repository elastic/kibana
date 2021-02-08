/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import type { FunctionComponent } from 'react';
import { Space } from '../common';

/**
 * @public
 */
export interface SpacesApi {
  readonly activeSpace$: Observable<Space>;
  getActiveSpace(): Promise<Space>;
  /**
   * UI API to use to add spaces capabilities to an application
   */
  ui: SpacesApiUi;
}

/**
 * @public
 */
export interface SpacesApiUi {
  /**
   * {@link SpacesApiUiComponent | React components} to support the spaces feature.
   */
  components: SpacesApiUiComponent;
}

/**
 * React UI components to be used to display the spaces feature in any application.
 *
 * @public
 */
export interface SpacesApiUiComponent {
  /**
   * Provides a context that is required to render all Spaces components.
   */
  SpacesContext: FunctionComponent;
  /**
   * Displays the tags for given saved object.
   */
  ShareToSpaceFlyout: FunctionComponent<ShareToSpaceFlyoutProps>;
  /**
   * Displays a corresponding list of spaces for a given list of saved object namespaces.
   */
  SpaceList: FunctionComponent<SpaceListProps>;
}

/**
 * @public
 */
export interface ShareToSpaceFlyoutProps {
  /**
   * The object to render the flyout for.
   */
  savedObjectTarget: ShareToSpaceSavedObjectTarget;
  /**
   * The EUI icon that is rendered in the flyout's title.
   *
   * Default is 'share'.
   */
  flyoutIcon?: string;
  /**
   * The string that is rendered in the flyout's title.
   *
   * Default is 'Edit spaces for object'.
   */
  flyoutTitle?: string;
  /**
   * When enabled, if the object is not yet shared to multiple spaces, a callout will be displayed that suggests the user might want to
   * create a copy instead.
   *
   * Default value is false.
   */
  enableCreateCopyCallout?: boolean;
  /**
   * When enabled, if no other spaces exist _and_ the user has the appropriate privileges, a sentence will be displayed that suggests the
   * user might want to create a space.
   *
   * Default value is false.
   */
  enableCreateNewSpaceLink?: boolean;
  /**
   * When enabled, the flyout will allow the user to remove the object from the current space. Otherwise, the current space is noted, and
   * the user cannot interact with it.
   *
   * Default value is false.
   */
  enableSpaceAgnosticBehavior?: boolean;
  /**
   * Optional handler that is called when the user has saved changes and there are spaces to be added to and/or removed from the object. If
   * this is not defined, a default handler will be used that calls `/api/spaces/_share_saved_object_add` and/or
   * `/api/spaces/_share_saved_object_remove` and displays toast(s) indicating what occurred.
   */
  changeSpacesHandler?: (spacesToAdd: string[], spacesToRemove: string[]) => Promise<void>;
  /**
   * Optional callback when the target object is updated.
   */
  onUpdate?: () => void;
  /**
   * Optional callback when the flyout is closed.
   */
  onClose?: () => void;
}

/**
 * @public
 */
export interface ShareToSpaceSavedObjectTarget {
  /**
   * The object's type.
   */
  type: string;
  /**
   * The object's ID.
   */
  id: string;
  /**
   * The namespaces that the object currently exists in.
   */
  namespaces: string[];
  /**
   * The EUI icon that is rendered in the flyout's subtitle.
   *
   * Default is 'empty'.
   */
  icon?: string;
  /**
   * The string that is rendered in the flyout's subtitle.
   *
   * Default is `${type} [id=${id}]`.
   */
  title?: string;
  /**
   * The string that is used to describe the object in several places, e.g., _Make **object** available in selected spaces only_.
   *
   * Default value is 'object'.
   */
  noun?: string;
}

/**
 * @public
 */
export interface SpaceListProps {
  /**
   * The namespaces of a saved object to render into a corresponding list of spaces.
   */
  namespaces: string[];
  /**
   * Optional limit to the number of spaces that can be displayed in the list. If the number of spaces exceeds this limit, they will be
   * hidden behind a "show more" button. Set to 0 to disable.
   *
   * Default value is 5.
   */
  displayLimit?: number;
  /**
   * When enabled, the space list will omit the active space. Otherwise, the active space is displayed.
   *
   * Default value is false.
   */
  enableSpaceAgnosticBehavior?: boolean;
}

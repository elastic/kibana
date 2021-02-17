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
  /**
   * Redirect the user from a legacy URL to a new URL. This needs to be used if a call to `SavedObjectsClient.resolve()` results in an
   * `"aliasMatch"` outcome, which indicates that the user has loaded the page using a legacy URL. Calling this function will trigger a
   * client-side redirect to the new URL, and it will display a toast to the user.
   *
   * Consumers need to determine the local path for the new URL on their own, based on the object ID that was used to call
   * `SavedObjectsClient.resolve()` (old ID) and the object ID in the result (new ID). For example...
   *
   * The old object ID is `workpad-123` and the new object ID is `workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e`.
   *
   * Full legacy URL: `https://localhost:5601/app/canvas#/workpad/workpad-123/page/1`
   *
   * New URL path: `#/workpad/workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e/page/1`
   *
   * The protocol, hostname, port, base path, and app path are automatically included.
   *
   * @param path The path to use for the new URL, optionally including `search` and/or `hash` URL components.
   * @param objectNoun The string that is used to describe the object in the toast, e.g., _The **object** you're looking for has a new
   * location_. Default value is 'object'.
   */
  redirectLegacyUrl: (path: string, objectNoun?: string) => Promise<void>;
}

/**
 * React UI components to be used to display the spaces feature in any application.
 *
 * @public
 */
export interface SpacesApiUiComponent {
  /**
   * Provides a context that is required to render some Spaces components.
   */
  SpacesContext: FunctionComponent<SpacesContextProps>;
  /**
   * Displays a flyout to edit the spaces that an object is shared to.
   *
   * Note: must be rendered inside of a SpacesContext.
   */
  ShareToSpaceFlyout: FunctionComponent<ShareToSpaceFlyoutProps>;
  /**
   * Displays a corresponding list of spaces for a given list of saved object namespaces. It shows up to five spaces (and an indicator for
   * any number of spaces that the user is not authorized to see) by default. If more than five named spaces would be displayed, the extras
   * (along with the unauthorized spaces indicator, if present) are hidden behind a button. If '*' (aka "All spaces") is present, it
   * supersedes all of the above and just displays a single badge without a button.
   *
   * Note: must be rendered inside of a SpacesContext.
   */
  SpaceList: FunctionComponent<SpaceListProps>;
  /**
   * Displays a callout that needs to be used if a call to `SavedObjectsClient.resolve()` results in an `"conflict"` outcome, which
   * indicates that the user has loaded the page which is associated directly with one object (A), *and* with a legacy URL that points to a
   * different object (B).
   *
   * In this case, `SavedObjectsClient.resolve()` has returned object A. This component displays a warning callout to the user explaining
   * that there is a conflict, and it includes a button that will redirect the user to object B when clicked.
   *
   * Consumers need to determine the local path for the new URL on their own, based on the object ID that was used to call
   * `SavedObjectsClient.resolve()` (A) and the `aliasTargetId` value in the response (B). For example...
   *
   * A is `workpad-123` and B is `workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e`.
   *
   * Full legacy URL: `https://localhost:5601/app/canvas#/workpad/workpad-123/page/1`
   *
   * New URL path: `#/workpad/workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e/page/1`
   */
  LegacyUrlConflict: FunctionComponent<LegacyUrlConflictProps>;
}

/**
 * @public
 */
export interface SpacesContextProps {
  /**
   * If a feature is specified, all Spaces components will treat it appropriately if the feature is disabled in a given Space.
   */
  feature?: string;
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
   * When set to 'within-space' (default), the flyout behaves like it is running on a page within the active space, and it will prevent the
   * user from removing the object from the active space.
   *
   * Conversely, when set to 'outside-space', the flyout behaves like it is running on a page outside of any space, so it will allow the
   * user to remove the object from the active space.
   */
  behaviorContext?: 'within-space' | 'outside-space';
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
   * When set to 'within-space' (default), the space list behaves like it is running on a page within the active space, and it will omit the
   * active space (e.g., it displays a list of all the _other_ spaces that an object is shared to).
   *
   * Conversely, when set to 'outside-space', the space list behaves like it is running on a page outside of any space, so it will not omit
   * the active space.
   */
  behaviorContext?: 'within-space' | 'outside-space';
}

/**
 * @public
 */
export interface LegacyUrlConflictProps {
  /**
   * The string that is used to describe the object in the callout, e.g., _There is a legacy URL for this page that points to a different
   * **object**_.
   *
   * Default value is 'object'.
   */
  objectNoun?: string;
  /**
   * The ID of the object that is currently shown on the page.
   */
  currentObjectId: string;
  /**
   * The ID of the other object that the legacy URL alias points to.
   */
  otherObjectId: string;
  /**
   * The path to use for the new URL, optionally including `search` and/or `hash` URL components.
   */
  otherObjectPath: string;
}

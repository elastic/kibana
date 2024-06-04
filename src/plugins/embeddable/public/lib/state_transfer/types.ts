/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';

export const EMBEDDABLE_EDITOR_STATE_KEY = 'embeddable_editor_state';

/**
 * A state package that contains information an editor will need to create or edit an embeddable then redirect back.
 * @public
 */
export interface EmbeddableEditorState {
  originatingApp: string;
  originatingPath?: string;
  embeddableId?: string;
  valueInput?: object;

  /**
   * Pass current search session id when navigating to an editor,
   * Editors could use it continue previous search session
   */
  searchSessionId?: string;
}

export function isEmbeddableEditorState(state: unknown): state is EmbeddableEditorState {
  return ensureFieldOfTypeExists('originatingApp', state, 'string');
}

export const EMBEDDABLE_PACKAGE_STATE_KEY = 'embeddable_package_state';

/**
 * A state package that contains all fields necessary to create or update an embeddable by reference or by value in a container.
 * @public
 */
export interface EmbeddablePackageState {
  type: string;
  input: object;
  embeddableId?: string;
  size?: {
    width?: number;
    height?: number;
  };
  /**
   * Copy dashboard panel transfers serialized panel state for React embeddables.
   * The rawState will be passed into the input and references are passed separately
   * so the container can update its references array and the updated references
   * are correctly passed to the factory's deserialize method.
   *
   * Legacy embeddables have already injected the references
   * into the input state, so they will not pass references.
   */
  references?: Reference[];

  /**
   * Pass current search session id when navigating to an editor,
   * Editors could use it continue previous search session
   */
  searchSessionId?: string;
}

export function isEmbeddablePackageState(state: unknown): state is EmbeddablePackageState {
  return (
    ensureFieldOfTypeExists('type', state, 'string') &&
    ensureFieldOfTypeExists('input', state, 'object')
  );
}

function ensureFieldOfTypeExists(key: string, obj: unknown, type?: string): boolean {
  return (
    Boolean(obj) &&
    key in (obj as { [key: string]: unknown }) &&
    (!type || typeof (obj as { [key: string]: unknown })[key] === type)
  );
}

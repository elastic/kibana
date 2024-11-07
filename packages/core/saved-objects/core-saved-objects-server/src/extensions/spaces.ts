/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The ISavedObjectsSpacesExtension interface defines the functions of a saved objects repository spaces extension.
 * It contains functions for getting the current namespace & getting and array of searchable spaces.
 */
export interface ISavedObjectsSpacesExtension {
  /**
   * Retrieves the active namespace ID. This is *not* the same as a namespace string. See also: `namespaceIdToString` and
   * `namespaceStringToId`.
   *
   * This takes the saved objects repository's namespace option as a parameter, and doubles as a validation function; if the namespace
   * option has already been set some other way, this will throw an error.
   */
  getCurrentNamespace: (namespace: string | undefined) => string | undefined;
  /**
   * Given a list of namespace strings, returns a subset that the user is authorized to search in.
   * If a wildcard '*' is used, it is expanded to an explicit list of namespace strings.
   */
  getSearchableNamespaces: (namespaces: string[] | undefined) => Promise<string[]>;
}

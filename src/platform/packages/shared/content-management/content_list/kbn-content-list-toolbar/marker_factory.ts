/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Static properties for marker component identification.
 */
export interface MarkerStaticProps {
  /** The role identifier (e.g., 'action', 'column'). */
  role?: string;
  /** The specific identifier within the role (e.g., 'delete', 'name'). */
  id?: string;
}

/**
 * Creates a declarative marker component that returns `null`.
 *
 * Marker components don't render anything; they are used for declarative
 * configuration where props are extracted via parsing functions.
 *
 * @param displayName - The display name for the component.
 * @param prefix - The prefix for static property names (e.g., 'SelectionAction' → `__kbnSelectionActionRole`).
 * @param staticProps - Optional static properties for identification.
 * @returns A React functional component that returns `null`.
 *
 * @example
 * ```tsx
 * // Create a simple marker.
 * export const StarredFilter = createMarkerComponent<StarredFilterProps>('StarredFilter');
 *
 * // Create a marker with static identification properties.
 * export const DeleteAction = createMarkerComponent<DeleteActionProps>(
 *   'DeleteAction',
 *   'SelectionAction',
 *   { role: 'action', id: 'delete' }
 * );
 * ```
 */
export const createMarkerComponent = <P>(
  displayName: string,
  prefix?: string,
  staticProps?: MarkerStaticProps
): React.FC<P> => {
  const Component = (_props: P): null => null;
  Component.displayName = displayName;

  if (prefix && staticProps) {
    const typedComponent = Component as Record<string, string>;
    if (staticProps.role) {
      typedComponent[`__kbn${prefix}Role`] = staticProps.role;
    }
    if (staticProps.id) {
      typedComponent[`__kbn${prefix}Id`] = staticProps.id;
    }
  }

  return Component;
};

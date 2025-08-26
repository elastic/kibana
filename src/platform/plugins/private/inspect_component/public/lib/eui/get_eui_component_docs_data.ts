/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEuiComponentNamesFromPath } from './get_eui_component_names_from_path';
import { EUI_COMPONENTS_DOCS_MAP, EUI_DOCS_BASE } from '../constants';

/**
 * Represents information about an EUI component.
 */
export interface EuiData {
  /** The React component name of this EUI component. */
  componentName: string;
  /** Link to the EUI documentation for this EUI component. */
  docsLink: string;
}

/**
 * Get EUI component documentation link and component name from a given component path.
 * If multiple EUI components are found in the path, the first one with a known documentation link is returned.
 * @param {string | null} componentPath The component path string.
 * @return {EuiData | null} An object containing the component name and documentation link, or null if no EUI component is found.
 */
export const getEuiComponentDocsData = (componentPath: string | null): EuiData | null => {
  if (!componentPath) return null;

  const toUrl = (name: string): string | null => {
    const docsLink = EUI_COMPONENTS_DOCS_MAP.get(name);

    if (!docsLink) return null;

    return `${EUI_DOCS_BASE}${docsLink}`;
  };

  const candidates = getEuiComponentNamesFromPath(componentPath);

  if (candidates.length === 0 && componentPath.startsWith('Eui')) {
    candidates.push(componentPath);
  }

  for (const candidate of candidates) {
    const exactUrl = toUrl(candidate);

    if (exactUrl) return { componentName: candidate, docsLink: exactUrl };
  }

  return null;
};

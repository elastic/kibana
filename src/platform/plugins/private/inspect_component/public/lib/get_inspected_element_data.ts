/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { DebugSource } from './fiber/types';
import { EUI_DOCS_BASE } from './constants';
import type { EuiData } from './eui/get_eui_component_docs_data';
import { getEuiComponentDocsData } from './eui/get_eui_component_docs_data';
import { getIconType } from './dom/get_icon_type';
import { findDebugSource } from './fiber/find_debug_source';
import type { InspectComponentResponse } from '../api/fetch_component_data';
import { fetchComponentData } from '../api/fetch_component_data';

/**
 * Represents information about a component.
 */
export interface ComponentData extends DebugSource, InspectComponentResponse {
  /** List of all teams who are codeowners for specified file. */
  codeowners: string[];
  /** Represents information about an EUI component. */
  euiData: EuiData;
  /** The EUI icon type for the icon inside this component. */
  iconType?: string;
  /** The name of the top level React component. */
  sourceComponent?: string;
}

/**
 * Parameters for {@link getInspectedElementData}.
 */
export interface GetInspectedElementDataOptions {
  /** Target element */
  target: HTMLElement | SVGElement;
  /** Kibana HTTP service. */
  httpService: HttpStart;
  /** The component path from the React Fiber node. */
  componentPath?: string;
  /** The name of the top level React component. */
  sourceComponent?: string;
}

/**
 * Combines data from React Fiber, fetchComponentData, and EUI documentation
 * to return detailed information about an inspected React element.
 * @async
 * @param {GetInspectedElementDataOptions} options
 * @param {HttpStart} options.httpService HTTP service for making API requests.
 * @param {string | undefined} options.componentPath The component path from the React Fiber node, if available.
 * @param {string | undefined} options.sourceComponent The name of the top-level React component, if available.
 * @param {HTMLElement | SVGElement} options.target The inspected DOM element (HTML or SVG).
 * @returns {Promise<ComponentData | undefined>} Resolves with the component data if found, otherwise undefined.
 */
export const getInspectedElementData = async ({
  httpService,
  target,
  componentPath,
  sourceComponent,
}: GetInspectedElementDataOptions): Promise<ComponentData | undefined> => {
  const fileData = findDebugSource(target);

  if (!fileData) {
    return undefined;
  }

  const response = await fetchComponentData({
    httpService,
    fileName: fileData.fileName,
  });

  if (!response) {
    return undefined;
  }

  const { baseFileName, codeowners, relativePath } = response;

  const iconType = getIconType(target);
  const euiDocs = getEuiComponentDocsData(componentPath);
  const euiData = {
    componentName: euiDocs?.componentName || 'N/A',
    docsLink: euiDocs?.docsLink || `${EUI_DOCS_BASE}/components`,
  };

  const componentData: ComponentData = {
    ...fileData,
    baseFileName,
    codeowners,
    euiData,
    iconType,
    relativePath,
    sourceComponent,
  };

  return componentData;
};

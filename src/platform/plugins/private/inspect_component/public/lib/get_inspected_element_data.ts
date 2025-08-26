/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { ReactFiberNodeWithDomElement, SourceComponent } from './fiber/types';
import { EUI_DOCS_BASE } from './constants';
import type { EuiData } from './eui/get_eui_component_docs_data';
import { getEuiComponentDocsData } from './eui/get_eui_component_docs_data';
import { getIconType } from './dom/get_icon_type';
import type { InspectComponentResponse } from '../api/fetch_component_data';
import { fetchComponentData } from '../api/fetch_component_data';

/**
 * Represents information about a component.
 */
export interface ComponentData extends ReactFiberNodeWithDomElement, InspectComponentResponse {
  /** List of all teams who are codeowners for specified file. */
  codeowners: string[];
  /** Represents information about an EUI component. */
  euiData: EuiData;
  /** The EUI icon type for the icon inside this component. */
  iconType: string | null;
  /** The name of the top-level React component where the path starts and the associated DOM element. */
  sourceComponent: SourceComponent;
  /** The component path in the format "SourceComponent : ParentComponent > ChildComponent". */
  componentPath: string | null;
}

/**
 * Parameters for {@link getInspectedElementData}.
 */
export interface GetInspectedElementDataOptions {
  /** Target element */
  target: HTMLElement;
  /** Kibana HTTP service. */
  httpService: HttpStart;
  /** The component path from the React Fiber node. */
  componentPath: string | null;
  /** The name of the top-level React component where the path starts and the associated DOM element. */
  sourceComponent: SourceComponent | null;
  /** The React Fiber node associated with the target element and the element itself. */
  targetFiberNodeWithDomElement: ReactFiberNodeWithDomElement | null;
}

/**
 * Combines data from React Fiber, fetchComponentData, and EUI documentation
 * to return detailed information about the inspected DOM element.
 * @async
 * @param {GetInspectedElementDataOptions} options
 * @param {HttpStart} options.httpService HTTP service for making API requests.
 * @param {HTMLElement} options.target The inspected DOM element.
 * @param {string | null} options.componentPath he component path in the format "SourceComponent : ParentComponent > ChildComponent".
 * @param {string | null} options.sourceComponent The name of the top-level React component where the path starts and the associated DOM element.
 * @param {ReactFiberNodeWithDomElement | null} options.targetFiberNodeWithDomElement The React Fiber node associated with the target element and the element itself.
 * @returns {Promise<ComponentData | null>} Resolves with the component data if found, otherwise null.
 */
export const getInspectedElementData = async ({
  httpService,
  target,
  componentPath,
  sourceComponent,
  targetFiberNodeWithDomElement,
}: GetInspectedElementDataOptions): Promise<ComponentData | null> => {
  if (!targetFiberNodeWithDomElement || !sourceComponent) {
    return null;
  }
  const response = await fetchComponentData({
    httpService,
    fileName: targetFiberNodeWithDomElement._debugSource.fileName,
  });

  if (!response) {
    return null;
  }

  const { baseFileName, codeowners, relativePath } = response;

  const iconType = getIconType(target);
  const euiDocs = getEuiComponentDocsData(componentPath);
  const euiData = {
    componentName: euiDocs?.componentName || 'N/A',
    docsLink: euiDocs?.docsLink || `${EUI_DOCS_BASE}/components`,
  };

  const componentData: ComponentData = {
    ...targetFiberNodeWithDomElement,
    baseFileName,
    codeowners,
    euiData,
    iconType,
    relativePath,
    sourceComponent,
    componentPath,
  };

  return componentData;
};

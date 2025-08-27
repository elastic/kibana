/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { findFirstEuiComponent } from './fiber/find_first_eui_component';
import type { EuiData, ReactFiberNodeWithHtmlElement, SourceComponent } from './fiber/types';
import { EUI_COMPONENTS_DOCS_MAP, EUI_DOCS_BASE } from './constants';
import { getIconType } from './dom/get_icon_type';
import type { InspectComponentResponse } from '../api/fetch_component_data';
import { fetchComponentData } from '../api/fetch_component_data';

/**
 * Represents information about a component.
 */
export interface ComponentData extends ReactFiberNodeWithHtmlElement, InspectComponentResponse {
  /** List of all teams who are codeowners for specified file. */
  codeowners: string[];
  /** Represents information about an EUI component. */
  euiData: EuiData;
  /** The EUI icon type for the icon inside this component. */
  iconType: string | null;
  /** The name of the top-level React component and the associated HTML element. */
  sourceComponent: SourceComponent;
}

/**
 * Options for {@link getInspectedElementData}.
 */
export interface GetInspectedElementDataOptions {
  /** Target element */
  target: HTMLElement;
  /** Kibana HTTP service. */
  httpService: HttpStart;
  /** The name of the top-level React component and the associated HTML element. */
  sourceComponent: SourceComponent | null;
  /** The React Fiber node associated with the target element and the element itself. */
  targetFiberNodeWithHtmlElement: ReactFiberNodeWithHtmlElement | null;
}

/**
 * Combines data from React Fiber, fetchComponentData, and EUI documentation
 * to return detailed information about the inspected HTML element.
 * @async
 * @param {GetInspectedElementDataOptions} options
 * @param {HttpStart} options.httpService HTTP service for making API requests.
 * @param {HTMLElement} options.target The inspected HTML element.
 * @param {string | null} options.sourceComponent The name of the top-level React component and the associated HTML element.
 * @param {ReactFiberNodeWithHtmlElement | null} options.targetFiberNodeWithHtmlElement The React Fiber node associated with the target element and the element itself.
 * @returns {Promise<ComponentData | null>} Resolves with the component data if found, otherwise null.
 */
export const getInspectedElementData = async ({
  httpService,
  target,
  sourceComponent,
  targetFiberNodeWithHtmlElement,
}: GetInspectedElementDataOptions): Promise<ComponentData | null> => {
  if (!targetFiberNodeWithHtmlElement || !sourceComponent) {
    return null;
  }
  const response = await fetchComponentData({
    httpService,
    fileName: targetFiberNodeWithHtmlElement._debugSource.fileName,
  });

  if (!response) {
    return null;
  }

  const { baseFileName, codeowners, relativePath } = response;

  const iconType = getIconType(target);
  const euiComponentType = findFirstEuiComponent(targetFiberNodeWithHtmlElement);
  const euiData = {
    componentName: euiComponentType || 'N/A',
    docsLink: euiComponentType
      ? `${EUI_DOCS_BASE}${EUI_COMPONENTS_DOCS_MAP.get(euiComponentType)}`
      : `${EUI_DOCS_BASE}/components`,
  };

  const componentData: ComponentData = {
    ...targetFiberNodeWithHtmlElement,
    baseFileName,
    codeowners,
    euiData,
    iconType,
    relativePath,
    sourceComponent,
  };

  return componentData;
};

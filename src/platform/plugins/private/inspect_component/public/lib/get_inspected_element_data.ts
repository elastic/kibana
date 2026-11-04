/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { findEuiComponentName } from '@kbn/react-fiber';
import type { DebugSource, ElementFiber } from '@kbn/react-fiber';
import { getIconType } from './dom/get_icon_type';
import { fetchComponentData } from '../api/fetch_component_data';
import { EUI_COMPONENTS_DOCS_MAP, EUI_DOCS_BASE } from './constants';
import type { InspectComponentResponse } from '../api/fetch_component_data';
import type { EuiData, SourceComponent } from './types';

/** Information about the file where the React component is defined. */
interface FileData extends DebugSource, InspectComponentResponse {
  /** List of codeowners for the component. */
  codeowners: string[];
}

/**
 * Represents information about an inspected component.
 */
export interface ComponentData {
  /** {@link EuiData} */
  euiData: EuiData;
  /** {@link SourceComponent} */
  sourceComponent: SourceComponent;
  /** {@link FileData} */
  fileData: FileData;
}

/**
 * Options for {@link getInspectedElementData}.
 */
export interface GetInspectedElementDataOptions {
  /** {@link HttpStart} */
  httpService: HttpStart;
  /** {@link SourceComponent} */
  sourceComponent: SourceComponent | null;
  /** {@link ElementFiber} */
  target: ElementFiber | null;
}

/** Only EUI components with a documentation page are reported. */
const isDocumentedEuiComponent = (name: string) => EUI_COMPONENTS_DOCS_MAP.has(name);

/**
 * Fetches and compiles data about the inspected component.
 * @async
 * @param {GetInspectedElementDataOptions} options
 * @param {HttpStart} options.httpService {@link HttpStart}
 * @param {SourceComponent | null} options.sourceComponent {@link SourceComponent}
 * @param {ElementFiber | null} options.target {@link ElementFiber}
 * @returns {Promise<ComponentData | null>} Resolves with {@link ComponentData component data} if found, otherwise null.
 */
export const getInspectedElementData = async ({
  httpService,
  sourceComponent,
  target,
}: GetInspectedElementDataOptions): Promise<ComponentData | null> => {
  if (!target || !sourceComponent) {
    return null;
  }

  const { element, fiber, source } = target;
  const { columnNumber, lineNumber, fileName } = source;
  const response = await fetchComponentData({ httpService, fileName });

  if (!response) {
    return null;
  }

  const { baseFileName, codeowners, relativePath } = response;
  const fileData = { columnNumber, lineNumber, fileName, baseFileName, codeowners, relativePath };

  const euiComponentType = findEuiComponentName(fiber, isDocumentedEuiComponent);
  const euiData = {
    componentType: euiComponentType || 'N/A',
    docsLink: euiComponentType
      ? `${EUI_DOCS_BASE}${EUI_COMPONENTS_DOCS_MAP.get(euiComponentType)}`
      : `${EUI_DOCS_BASE}/components`,
    iconType: getIconType(element),
  };

  return { fileData, euiData, sourceComponent };
};

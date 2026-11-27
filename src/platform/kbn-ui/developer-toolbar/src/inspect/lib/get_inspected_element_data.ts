/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findEuiComponentName } from '../../react_fiber';
import type { DebugSource, ElementFiber } from '../../react_fiber';
import { getIconType } from './dom/get_icon_type';
import { EUI_COMPONENTS_DOCS_MAP, EUI_DOCS_BASE } from './constants';
import type { InspectFileData, InspectHostConfig } from '../types';
import type { EuiData, SourceComponent } from './types';

/** Information about the file where the React component is defined. */
export interface FileData extends DebugSource, InspectFileData {
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
  /** Host resolver for the `_debugSource` file name. */
  resolveFileData: InspectHostConfig['resolveFileData'];
  /** {@link SourceComponent} */
  sourceComponent: SourceComponent | null;
  /** {@link ElementFiber} */
  target: ElementFiber | null;
}

/** Only EUI components with a documentation page are reported. */
const isDocumentedEuiComponent = (name: string) => EUI_COMPONENTS_DOCS_MAP.has(name);

/**
 * Resolves and compiles data about the inspected component.
 *
 * @param options - {@link GetInspectedElementDataOptions}
 * @returns {@link ComponentData Component data}, or `null` if the component or its file cannot be resolved.
 */
export const getInspectedElementData = async ({
  resolveFileData,
  sourceComponent,
  target,
}: GetInspectedElementDataOptions): Promise<ComponentData | null> => {
  if (!target || !sourceComponent) {
    return null;
  }

  const { element, fiber, source } = target;
  const { columnNumber, lineNumber, fileName } = source;
  const response = await resolveFileData(fileName).catch(() => null);

  if (!response) {
    return null;
  }

  const { baseFileName, codeowners = [], relativePath } = response;
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

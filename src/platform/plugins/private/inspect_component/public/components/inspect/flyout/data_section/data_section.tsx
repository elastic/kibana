/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiDocsLink } from './eui_docs_link';
import { ComponentPreview } from './component_preview';
import { ComponentTitle } from './component_title';
import { IconType } from './icon_type';
import { CodeownersList } from './codeowners_list';
import type { ComponentData } from '../../../../lib/get_inspected_element_data';

interface Props {
  componentData: ComponentData;
}

export const DataSection = ({ componentData }: Props) => {
  const {
    fileData: { codeowners },
    euiData,
    sourceComponent,
  } = componentData;

  return (
    <>
      <ComponentPreview element={sourceComponent.element} />
      <ComponentTitle sourceComponentType={sourceComponent.type} />
      <CodeownersList codeowners={codeowners} />
      <IconType iconType={euiData.iconType} />
      <EuiDocsLink euiData={euiData} />
    </>
  );
};

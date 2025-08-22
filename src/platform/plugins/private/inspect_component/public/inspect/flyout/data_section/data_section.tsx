/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { EuiDocsLink } from './eui_docs_link';
import { PreviewImage } from './preview_image';
import { ComponentTitle } from './component_title';
import { IconData } from './icon_data';
import { CodeownersList } from './codeowners_list';
import type { ComponentData } from '../../../types';

interface Props {
  componentData: ComponentData;
}

export const DataSection = ({ componentData }: Props) => {
  if (!componentData) return null;

  const { codeowners, euiInfo, iconType, sourceComponent, image } = componentData;

  return (
    <>
      <PreviewImage image={image} />
      <ComponentTitle sourceComponent={sourceComponent} />
      <EuiSpacer size="m" />
      <CodeownersList codeowners={codeowners} />
      <EuiSpacer size="m" />
      <IconData iconType={iconType} />
      <EuiDocsLink euiInfo={euiInfo} />
    </>
  );
};

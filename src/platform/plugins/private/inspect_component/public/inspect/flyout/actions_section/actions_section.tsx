/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ActionButtons } from './action_buttons';
import { ActionsSubtitle } from './actions_subtitle';
import { ActionsTitle } from './actions_title';
import type { ComponentData } from '../../../types';

interface Props {
  componentData: ComponentData;
}

export const ActionsSection = ({ componentData }: Props) => {
  if (!componentData) return null;

  const { columnNumber, fileName, lineNumber, relativePath, baseFileName } = componentData;

  return (
    <>
      <ActionsTitle />
      <ActionsSubtitle relativePath={relativePath} baseFileName={baseFileName} />
      <ActionButtons
        fileName={fileName}
        lineNumber={lineNumber}
        columnNumber={columnNumber}
        relativePath={relativePath}
      />
    </>
  );
};

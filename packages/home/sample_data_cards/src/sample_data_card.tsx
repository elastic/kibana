/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

import { useServices } from './services';
import { SampleDataCard as Component } from './sample_data_card.component';

import type { SampleDataSet } from './types';

export interface Props {
  sampleDataSet: SampleDataSet;
  onStatusChange: (id: string) => void;
}

export const SampleDataCard = ({ sampleDataSet, onStatusChange }: Props) => {
  const { addBasePath } = useServices();
  const { colorMode } = useEuiTheme();
  const { darkPreviewImagePath, previewImagePath } = sampleDataSet;
  const path =
    colorMode === 'DARK' && darkPreviewImagePath ? darkPreviewImagePath : previewImagePath;
  const imagePath = useMemo(() => addBasePath(path), [addBasePath, path]);

  return <Component {...{ sampleDataSet, imagePath, onStatusChange }} />;
};

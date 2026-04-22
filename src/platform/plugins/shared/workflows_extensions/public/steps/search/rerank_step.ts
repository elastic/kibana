/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreSetup, HttpStart } from '@kbn/core/public';
import { createInferenceIdSelectionHandler } from './inference_id_selection';
import { rerankStepCommonDefinition } from '../../../common/steps/search/rerank_step';
import { createPublicStepDefinition } from '../../step_registry/types';

export const createRerankStepDefinition = (core: CoreSetup) => {
  let httpPromise: Promise<HttpStart> | null = null;

  const getHttp = async (): Promise<HttpStart> => {
    if (!httpPromise) {
      httpPromise = core.getStartServices().then(([coreStart]) => coreStart.http);
    }
    return httpPromise;
  };

  return createPublicStepDefinition({
    ...rerankStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/sortable').then(({ icon }) => ({
        default: icon,
      }))
    ),
    editorHandlers: {
      config: {
        inference_id: {
          selection: createInferenceIdSelectionHandler(getHttp),
        },
      },
    },
  });
};

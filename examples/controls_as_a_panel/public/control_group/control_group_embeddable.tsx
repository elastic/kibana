/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import React from 'react';
import { CONTROL_PANEL_ID } from './constants';
import { MarkdownEditorApi, MarkdownEditorSerializedState } from './types';

export const markdownEmbeddableFactory: EmbeddableFactory<
  MarkdownEditorSerializedState,
  MarkdownEditorApi
> = {
  type: CONTROL_PANEL_ID,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const api = finalizeApi({});

    return {
      api,
      Component: () => {
        return <>here</>;
      },
    };
  },
};

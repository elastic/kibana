/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Dispatch } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FiltersEditorActions } from './filters_editor_reducer';

interface FiltersEditorContextType {
  dataView: DataView;
  dispatch: Dispatch<FiltersEditorActions>;
  globalParams: {
    maxDepth: number;
    disableOr: boolean;
    disableAnd: boolean;
  };
}

export const FiltersEditorContextType = React.createContext<FiltersEditorContextType>(
  {} as FiltersEditorContextType
);

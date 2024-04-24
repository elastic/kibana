/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HasSerializableState } from '@kbn/presentation-containers';
import { HasParentApi, HasUniqueId } from '@kbn/presentation-publishing';
import { EmbeddableAppContext } from '..';

export interface HasEditorApp {
  getEditorAppTarget: () => Promise<{ editApp: string; editPath: string }>;
}

export interface HasAppContext {
  getAppContext: () => EmbeddableAppContext;
}

export const apiHasAppContext = (unknownApi: unknown): unknownApi is HasAppContext => {
  return (
    (unknownApi as HasAppContext).getAppContext !== undefined &&
    typeof (unknownApi as HasAppContext).getAppContext === 'function'
  );
};

export type NavigateToEditorApi = HasUniqueId &
  HasEditorApp &
  Partial<HasSerializableState & HasParentApi<unknown>>;

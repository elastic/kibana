/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { ErrorEmbeddable, IContainer } from '@kbn/embeddable-plugin/public';
import type { VisualizeInput } from '..';
import {
  getRelinkSavedObjectErrorMessage,
  RelinkSavedObject,
  RelinkSavedObjectMeta,
  shouldShowRelinkSavedObjectError,
} from '../components/relink_saved_object';

export const withHandlingMissedSavedObject = async (
  core: CoreStart,
  fn: Function,
  input: Partial<VisualizeInput> & { id: string },
  parent: IContainer | undefined,
  rootSavedObjectMeta: RelinkSavedObjectMeta,
  partialMissedSavedObjectMeta: Pick<RelinkSavedObjectMeta, 'type' | 'name'>
) => {
  try {
    return await fn();
  } catch (e) {
    if (shouldShowRelinkSavedObjectError(e, 'data view')) {
      const missedSavedObjectMeta: RelinkSavedObjectMeta = {
        ...partialMissedSavedObjectMeta,
        id: e.savedObjectId!,
        name: e.savedObjectType,
      };

      const canSaveVisualization = Boolean(core.application.capabilities.visualize?.save);

      return new ErrorEmbeddable(
        getRelinkSavedObjectErrorMessage(missedSavedObjectMeta),
        input,
        parent,
        canSaveVisualization ? (
          <RelinkSavedObject
            onRelink={() => {
              // @todo: find a better way to do that
              window.location.reload();
            }}
            rootSavedObjectMeta={rootSavedObjectMeta}
            missedSavedObjectMeta={missedSavedObjectMeta}
            services={{
              savedObjects: core.savedObjects,
              uiSettings: core.uiSettings,
            }}
          />
        ) : null
      );
    }

    throw e;
  }
};

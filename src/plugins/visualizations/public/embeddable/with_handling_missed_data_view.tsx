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
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { VisualizeInput } from '..';
import {
  getRelinkSavedObjectErrorMessage,
  RelinkSavedObject,
  RelinkSavedObjectMeta,
  shouldShowRelinkSavedObjectError,
  RelinkCallback,
} from '../components/relink_saved_object';
import { SAVED_VIS_TYPE } from '../utils/saved_visualize_utils';

/** @internal **/
interface RootSavedObjectInputMeta {
  visId?: string;
  parent?: IContainer;
  input: Partial<VisualizeInput> & { id: string };
}

const defaultOnRelink: RelinkCallback = (missedSavedObjectId, selectedSavedObjectId) => {
  window.location.assign(
    window.location.href.replaceAll(missedSavedObjectId, selectedSavedObjectId)
  );
  window.location.reload();
};

const getRootSavedObjectMeta = ({ visId, parent }: RootSavedObjectInputMeta) => {
  if (visId) {
    return { id: visId, type: SAVED_VIS_TYPE };
  }
  if (parent) {
    return { id: parent.id, type: parent.type };
  }
  return undefined;
};

export const withHandlingMissedDataView = async (
  core: CoreStart,
  fn: Function,
  meta: {
    visId?: string;
    parent?: IContainer;
    input: Partial<VisualizeInput> & { id: string };
  },
  onRelink: RelinkCallback = defaultOnRelink
) => {
  try {
    return await fn();
  } catch (e) {
    if (shouldShowRelinkSavedObjectError(e, 'data view')) {
      const missedSavedObjectMeta: RelinkSavedObjectMeta = {
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: e.savedObjectId!,
        name: e.savedObjectType,
      };
      const rootSavedObjectMeta = getRootSavedObjectMeta(meta);
      const canSaveVisualization = Boolean(core.application.capabilities.visualize?.save);

      return new ErrorEmbeddable(
        getRelinkSavedObjectErrorMessage(missedSavedObjectMeta),
        meta.input,
        meta.parent,
        canSaveVisualization && rootSavedObjectMeta?.id ? (
          <RelinkSavedObject
            onRelink={onRelink}
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

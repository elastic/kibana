/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { SavedObjectFinderUiProps } from '@kbn/saved-objects-plugin/public';
import { RelinkSavedObjectMeta } from './types';

export type GetSavedObjectMetaDataForFinderUI = (
  type: RelinkSavedObjectMeta['type']
) => SavedObjectFinderUiProps['savedObjectMetaData'];

/** @internal **/
export const getDefaultSavedObjectMetaDataForFinderUI: GetSavedObjectMetaDataForFinderUI = (
  type: RelinkSavedObjectMeta['type']
) => {
  switch (type) {
    case DATA_VIEW_SAVED_OBJECT_TYPE:
      return [
        {
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
          getIconForSavedObject: () => 'indexPatternApp',
          name: i18n.translate('visualizations.relinkSavedObjectFlyout.dataView', {
            defaultMessage: 'Data view',
          }),
        },
      ];
    default:
      return [];
  }
};

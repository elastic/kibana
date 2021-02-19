/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'src/core/public';
import { IndexPattern, UsageCollectionStart } from '../../shared_imports';
import { pluginName } from '../../constants';
import { DeleteRuntimeFieldProvider, Props as DeleteProviderProps } from './delete_field_provider';
import { DataPublicPluginStart } from '../../../../data/public';

export interface Props extends Omit<DeleteProviderProps, 'onConfirmDelete'> {
  indexPattern: IndexPattern;
  onDelete?: (fieldNames: string[]) => void;
}

export const getDeleteProvider = (
  indexPatternService: DataPublicPluginStart['indexPatterns'],
  usageCollection: UsageCollectionStart,
  notifications: NotificationsStart
): React.FunctionComponent<Props> => {
  return React.memo(({ indexPattern, children, onDelete }: Props) => {
    const deleteFields = useCallback(
      async (fieldNames: string[]) => {
        fieldNames.forEach((fieldName) => {
          indexPattern.removeRuntimeField(fieldName);
        });

        try {
          usageCollection.reportUiCounter(
            pluginName,
            usageCollection.METRIC_TYPE.COUNT,
            'delete_runtime'
          );
          // eslint-disable-next-line no-empty
        } catch {}

        try {
          await indexPatternService.updateSavedObject(indexPattern);
        } catch (e) {
          const title = i18n.translate('indexPatternFieldEditor.save.deleteErrorTitle', {
            defaultMessage: 'Failed to save field removal',
          });
          notifications.toasts.addError(e, { title });
        }

        if (onDelete) {
          onDelete(fieldNames);
        }
      },
      [onDelete, indexPattern]
    );

    return <DeleteRuntimeFieldProvider children={children} onConfirmDelete={deleteFields} />;
  });
};

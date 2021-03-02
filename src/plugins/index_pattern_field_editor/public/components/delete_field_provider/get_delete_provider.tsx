/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import { NotificationsStart } from 'src/core/public';
import { IndexPattern, UsageCollectionStart } from '../../shared_imports';
import { DeleteRuntimeFieldProvider, Props as DeleteProviderProps } from './delete_field_provider';
import { DataPublicPluginStart } from '../../../../data/public';
import { removeFields } from '../../lib/remove_fields';

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
        await removeFields(fieldNames, indexPattern, {
          indexPatternService,
          usageCollection,
          notifications,
        });

        if (onDelete) {
          onDelete(fieldNames);
        }
      },
      [onDelete, indexPattern]
    );

    return <DeleteRuntimeFieldProvider children={children} onConfirmDelete={deleteFields} />;
  });
};

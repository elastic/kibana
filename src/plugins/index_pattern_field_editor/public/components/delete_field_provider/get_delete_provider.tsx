/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import React, { useCallback } from 'react';

import { IndexPattern } from '../../shared_imports';
import { DeleteRuntimeFieldProvider, Props as DeleteProviderProps } from './delete_field_provider';

export interface Props extends Omit<DeleteProviderProps, 'onConfirmDelete'> {
  indexPattern: IndexPattern;
  onDelete?: (fieldNames: string[]) => void;
}

export const getDeleteProvider = (/* Dependencies will come here*/): React.FunctionComponent<Props> => {
  return React.memo(({ indexPattern, children, onDelete }: Props) => {
    const deleteFields = useCallback(
      (fieldNames: string[]) => {
        // TODO: Add logic here to delete the field

        if (onDelete) {
          onDelete(fieldNames);
        }

        // Temp code as we need to return a Promise
        // Remove once delete logic is implemented.
        return Promise.resolve();
      },
      [onDelete]
    );

    return <DeleteRuntimeFieldProvider children={children} onConfirmDelete={deleteFields} />;
  });
};

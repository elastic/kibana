/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useEffect } from 'react';

import { DataView } from '../shared_imports';
import { OpenFieldDeleteModalOptions } from '../open_delete_modal';
import { CloseEditor } from '../types';

type DeleteFieldFunc = (fieldName: string | string[]) => void;
export interface Props {
  children: (deleteFieldHandler: DeleteFieldFunc) => React.ReactNode;
  /**
   * Data view of fields to be deleted
   */
  dataView: DataView;
  /**
   * Callback fired when fields are deleted
   * @param fieldNames - the names of the deleted fields
   */
  onDelete?: (fieldNames: string[]) => void;
}

export const getDeleteFieldProvider = (
  modalOpener: (options: OpenFieldDeleteModalOptions) => Promise<CloseEditor>
): React.FunctionComponent<Props> => {
  return React.memo(({ dataView, children, onDelete }: Props) => {
    const closeModal = useRef<CloseEditor | null>(null);
    const deleteFields = useCallback(
      async (fieldName: string | string[]) => {
        if (closeModal.current) {
          closeModal.current();
        }
        closeModal.current = await modalOpener({
          ctx: {
            dataView,
          },
          fieldName,
          onDelete,
        });
      },
      [onDelete, dataView]
    );

    useEffect(() => {
      return () => {
        if (closeModal.current) {
          closeModal.current();
        }
      };
    }, []);

    return <>{children(deleteFields)}</>;
  });
};

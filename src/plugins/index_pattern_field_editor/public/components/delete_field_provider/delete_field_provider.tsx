/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { DeleteFieldModal } from '../delete_field_modal';

type DeleteFieldFunc = (fieldName: string | string[]) => void;

export interface Props {
  children: (deleteFieldHandler: DeleteFieldFunc) => React.ReactNode;
  onConfirmDelete: (fieldsToDelete: string[]) => Promise<void>;
}

interface State {
  isModalOpen: boolean;
  fieldsToDelete: string[];
}

export const DeleteRuntimeFieldProvider = ({ children, onConfirmDelete }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false, fieldsToDelete: [] });

  const { isModalOpen, fieldsToDelete } = state;

  const deleteField: DeleteFieldFunc = useCallback((fieldNames) => {
    setState({
      isModalOpen: true,
      fieldsToDelete: Array.isArray(fieldNames) ? fieldNames : [fieldNames],
    });
  }, []);

  const closeModal = useCallback(() => {
    setState({ isModalOpen: false, fieldsToDelete: [] });
  }, []);

  const confirmDelete = useCallback(async () => {
    try {
      await onConfirmDelete(fieldsToDelete);
      closeModal();
    } catch (e) {
      // silently fail as "onConfirmDelete" is responsible
      // to show a toast message if there is an error
    }
  }, [closeModal, onConfirmDelete, fieldsToDelete]);

  return (
    <>
      {children(deleteField)}

      {isModalOpen && (
        <DeleteFieldModal
          fieldsToDelete={fieldsToDelete}
          confirmDelete={confirmDelete}
          closeModal={closeModal}
        />
      )}
    </>
  );
};

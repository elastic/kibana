/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useGeneratedHtmlId } from '@elastic/eui';
import { useState, useCallback, ChangeEvent, SyntheticEvent } from 'react';
import * as i18n from '../../translations';
import { ListDetails } from '../../types';

interface UseEditModal {
  listDetails: ListDetails;
  onSave: (newListDetails: ListDetails) => void;
}

export const useEditModal = ({ listDetails, onSave }: UseEditModal) => {
  const modalFormId = useGeneratedHtmlId({ prefix: 'modalForm' });
  const [newListDetails, setNewListDetails] = useState(listDetails);
  const [showProgress, setShowProgress] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const setIsTouchedValue = useCallback((): void => {
    setError(!newListDetails.name ? i18n.LIST_NAME_REQUIRED_ERROR : undefined);
  }, [newListDetails.name]);

  const onChange = ({ target }: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = target;
    setNewListDetails({ ...newListDetails, [name]: value.trim() });
  };

  const onSubmit = (e?: SyntheticEvent) => {
    if (error) return;
    setShowProgress(true);
    onSave(newListDetails);
    e?.preventDefault();
  };
  return {
    error,
    modalFormId,
    newListDetails,
    showProgress,
    setIsTouchedValue,
    onChange,
    onSubmit,
  };
};

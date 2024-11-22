/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  const [newListDetails, setNewListDetails] = useState<ListDetails>(listDetails);
  const [showProgress, setShowProgress] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const onBlur = useCallback(
    ({ target }: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const { name, value } = target;
      const trimmedValue = value.trim();
      setNewListDetails({ ...newListDetails, [name]: trimmedValue });
      if (name === 'name') setError(!trimmedValue ? i18n.LIST_NAME_REQUIRED_ERROR : undefined);
    },
    [newListDetails]
  );

  const onChange = ({ target }: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = target;
    setNewListDetails({ ...newListDetails, [name]: value });
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
    onBlur,
    onChange,
    onSubmit,
  };
};

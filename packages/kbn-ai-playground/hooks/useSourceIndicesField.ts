/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexName } from '@elastic/elasticsearch/lib/api/types';
import { useController } from 'react-hook-form';
import { ChatFormFields } from '../types';

export const useSourceIndicesField = () => {
  const {
    field: { value: selectedIndices, onChange },
  } = useController({ name: ChatFormFields.indices, defaultValue: [] });
  const addIndex = (newIndex: IndexName) => {
    onChange([...selectedIndices, newIndex]);
  };
  const removeIndex = (index: IndexName) => {
    onChange(selectedIndices.filter((indexName: string) => indexName !== index));
  };

  return {
    selectedIndices,
    addIndex,
    removeIndex,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState } from 'react';
import { Item } from '../types';

interface Errors {
  title: { message: string } | null;
  description: { message: string } | null;
}

export const useMetadataForm = ({ item }: { item: Item }) => {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? '');
  const [errors, setErrors] = useState<Errors>({
    title: null,
    description: null,
  });

  return {
    title,
    setTitle,
    description,
    setDescription,
    errors,
    setErrors,
  };
};

export type MetadataFormState = ReturnType<typeof useMetadataForm>;

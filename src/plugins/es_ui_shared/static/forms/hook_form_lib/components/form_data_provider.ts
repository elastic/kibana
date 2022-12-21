/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { FormData } from '../types';
import { useFormData } from '../hooks';

interface Props<I> {
  children: (formData: I) => JSX.Element | null;
  pathsToWatch?: string | string[];
}

const FormDataProviderComp = function <I extends FormData = FormData>({
  children,
  pathsToWatch,
}: Props<I>) {
  const { 0: formData, 2: haveFieldsMounted } = useFormData<I>({ watch: pathsToWatch });

  if (!haveFieldsMounted) {
    return null;
  }

  return children(formData);
};

/**
 * Context provider to access the form data.
 * @deprecated Use the "useFormData()" hook instead
 */
export const FormDataProvider = React.memo(FormDataProviderComp) as typeof FormDataProviderComp;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';

export type HandleChange = (partialModel: Record<string, any>) => void;

export const createSelectHandler =
  (handleChange: HandleChange) =>
  (name: string) =>
  (selected: EuiComboBoxOptionOption[] = []) =>
    handleChange?.({
      [name]: selected[0]?.value ?? null,
    });

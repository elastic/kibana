/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DefaultItemAction } from '@elastic/eui';

export function getExpandAction<T extends object>({
  name,
  description,
  isExpanded,
  onClick,
  ...props
}: {
  name: string;
  description: string;
  isExpanded: (value: T) => boolean;
  onClick: (valute: T | undefined) => void;
  'data-test-subj': string;
}): DefaultItemAction<T> {
  return {
    name,
    description,
    type: 'icon',
    'data-test-subj': props['data-test-subj'],
    icon: (value: T) => (isExpanded(value) ? 'arrowDown' : 'arrowRight'),
    onClick: (value: T) => onClick(isExpanded(value) ? undefined : value),
  };
}

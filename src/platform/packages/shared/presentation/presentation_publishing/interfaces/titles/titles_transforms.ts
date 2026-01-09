/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedTitles, StoredTitles } from '@kbn/presentation-publishing-schemas';

export const transformTitlesIn = <ApiStateType extends SerializedTitles>(
  state: ApiStateType
): Omit<ApiStateType, keyof SerializedTitles> & StoredTitles => {
  const { hide_title, title, description, ...rest } = state;

  return {
    ...rest,
    ...(typeof hide_title === 'boolean' ? { hidePanelTitles: hide_title } : {}),
    ...(description ? { description } : {}),
    ...(title ? { title } : {}),
  };
};

export const transformTitlesOut = <StoredStateType extends StoredTitles>(
  state: StoredStateType
): Omit<StoredStateType, keyof StoredTitles> & SerializedTitles => {
  const { hidePanelTitles, title, description, ...rest } = state;
  return {
    ...rest,
    ...(typeof hidePanelTitles === 'boolean' ? { hide_title: hidePanelTitles } : {}),
    ...(description ? { description } : {}),
    ...(title ? { title } : {}),
  };
};

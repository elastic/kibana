/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { SerializedStyles } from '@emotion/react';
import { FavoriteButton } from '@kbn/content-management-favorites-public';
import { useContentListConfig } from '@kbn/content-list-provider';

export interface StarButtonProps {
  /** Item ID to star/unstar. */
  id: string;
  /** Optional CSS `className` for alignment styles. */
  className?: string;
  /**
   * Optional Emotion styles applied to a wrapping `span`.
   * Use for margin adjustments when rendered inline (e.g. inside {@link NameCell}).
   */
  css?: SerializedStyles;
}

/**
 * Thin wrapper around `FavoriteButton` that renders `null` when
 * `supports.starred` is false. Shared by `StarredCell` and `NameCell`.
 */
export const StarButton = ({ id, className, css: cssProp }: StarButtonProps) => {
  const { supports } = useContentListConfig();

  if (!supports.starred) {
    return null;
  }

  if (cssProp) {
    return (
      <span css={cssProp}>
        <FavoriteButton {...{ id, className }} />
      </span>
    );
  }

  return <FavoriteButton {...{ id, className }} />;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const TRUNCATE_GRADIENT_HEIGHT = 5;

export const getTruncateStyles = (maxHeight: number) => {
  return {
    display: 'inline-block',
    maxHeight: maxHeight > 0 ? maxHeight : 'none',
    overflow: 'hidden',
    '&:before': {
      top: maxHeight > 0 ? maxHeight - TRUNCATE_GRADIENT_HEIGHT : TRUNCATE_GRADIENT_HEIGHT * -1,
    },
  };
};

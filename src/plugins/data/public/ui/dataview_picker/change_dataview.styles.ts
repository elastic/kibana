/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const DATA_VIEW_POPOVER_CONTENT_WIDTH = 280;

export const ChangeDataViewStyles = ({ fullWidth }: { fullWidth?: boolean }) => {
  return {
    trigger: {
      maxWidth: fullWidth ? undefined : DATA_VIEW_POPOVER_CONTENT_WIDTH,
    },
    popoverContent: {
      width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
    },
  };
};

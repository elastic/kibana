/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface PreviewErrorArgs {
  reason: string;
  scriptStack?: string[];
  position?: { offset: number; start: number; end: number } | null;
}

export const createPreviewError = ({
  reason,
  scriptStack = [],
  position = null,
}: PreviewErrorArgs) => {
  return {
    caused_by: { reason },
    position,
    script_stack: scriptStack,
  };
};

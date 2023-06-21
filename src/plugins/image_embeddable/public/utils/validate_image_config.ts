/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RecursivePartial } from '@elastic/eui';
import { ImageConfig } from '../types';
import { ValidateUrlFn } from './validate_url';

export type DraftImageConfig = RecursivePartial<ImageConfig>;
export function validateImageConfig(
  draftConfig: DraftImageConfig,
  { validateUrl }: { validateUrl: ValidateUrlFn }
): draftConfig is ImageConfig {
  if (!draftConfig.src) return false;
  if (draftConfig.src.type === 'file') {
    if (!draftConfig.src.fileId) return false;
  } else if (draftConfig.src.type === 'url') {
    if (!draftConfig.src.url) return false;
    if (!validateUrl(draftConfig.src.url).isValid) return false;
  }

  return true;
}

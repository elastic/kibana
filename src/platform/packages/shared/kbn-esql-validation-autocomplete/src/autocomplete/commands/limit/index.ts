/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CommandSuggestParams } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import { buildConstantsDefinitions } from '../../factories';
import { pipeCompleteItem } from '../../complete_items';

export function suggest({ innerText }: CommandSuggestParams<'limit'>): SuggestionRawDefinition[] {
  if (/[0-9]\s+$/.test(innerText)) {
    return [pipeCompleteItem];
  }

  return buildConstantsDefinitions(['10', '100', '1000'], '', undefined, {
    advanceCursorAndOpenSuggestions: true,
  });
}

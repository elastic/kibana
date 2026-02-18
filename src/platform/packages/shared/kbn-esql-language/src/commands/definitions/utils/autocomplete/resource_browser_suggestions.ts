/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createIndicesBrowserSuggestion } from '../../../registry/complete_items';
import type { ICommandCallbacks, ICommandContext, ISuggestionItem } from '../../../registry/types';
import { buildResourceBrowserCommandArgs } from '../../../../language/autocomplete/autocomplete_utils';
import { isRestartingExpression } from '../shared';

export async function getIndicesBrowserSuggestion({
  callbacks,
  context,
  innerText,
}: {
  callbacks?: ICommandCallbacks;
  context?: ICommandContext;
  innerText?: string;
}): Promise<ISuggestionItem | undefined> {
  const isResourceBrowserEnabled = (await callbacks?.isResourceBrowserEnabled?.()) ?? false;
  if (!isResourceBrowserEnabled || context?.isCursorInSubquery) {
    return undefined;
  }

  const commandArgs = buildResourceBrowserCommandArgs({
    // Do not show hidden sources in the resource browser
    sources: context?.sources?.filter((source) => !source.hidden),
    timeSeriesSources: context?.timeSeriesSources,
  });

  return createIndicesBrowserSuggestion(commandArgs, innerText);
}

export function shouldSuggestIndicesBrowserAfterComma(commandText: string): boolean {
  const normalizedCommandText = commandText.trimEnd();
  return Boolean(isRestartingExpression(commandText)) && /,\s*\/?$/i.test(normalizedCommandText);
}

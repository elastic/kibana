/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { QuickFix } from './types';
import type { ErrorTypes } from '../../commands/definitions/types';
import { fixesByMessageCode } from './fixes_by_message_code';

export interface EsqlCodeAction {
  title: string;
  fixedText: string;
}

/**
 * Computes the quick-fix code actions associated with an ESQLMessage.
 */
export async function getQuickFixForMessage({
  queryString,
  message,
  callbacks,
}: {
  queryString: string;
  message: {
    // For now we only have query global quick fixes registered,so with the code is enough
    // but if local quick fixes are needed, we should add start and end positions to the message interface.
    code: string;
  };
  callbacks?: ESQLCallbacks;
}): Promise<EsqlCodeAction | undefined> {
  const quickFix = fixesByMessageCode[message.code as ErrorTypes];
  if (!quickFix) {
    return undefined;
  }

  const shouldDisplay = await shouldDisplayQuickFix(quickFix, queryString, callbacks);
  if (!shouldDisplay) {
    return undefined;
  }

  let fixedText: string;
  try {
    fixedText = quickFix.fixQuery(queryString);
  } catch {
    // If the quick fix fails to generate a valid query, we don't display it.
    return undefined;
  }

  return {
    title: quickFix.title,
    fixedText,
  };
}

/**
 * Determines if the quick fix should be displayed under some special condition,
 * it will be always visible for the given message if no condition is provided.
 */
async function shouldDisplayQuickFix(
  quickFix: QuickFix,
  queryString: string,
  callbacks: ESQLCallbacks | undefined
): Promise<boolean> {
  if (!quickFix.displayCondition) {
    return true;
  }
  try {
    return await quickFix.displayCondition(queryString, callbacks ?? {});
  } catch {
    return false;
  }
}

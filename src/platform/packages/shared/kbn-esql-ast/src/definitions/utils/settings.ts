/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withAutoSuggest } from '../../..';
import type { ISuggestionItem } from '../../commands_registry/types';
import { settings } from '../generated/settings';

export function getSettingsCompletionItems(isServerless?: boolean): ISuggestionItem[] {
  return (
    settings
      // Filter out serverless-only settings if not in serverless mode, if not flavour is provided don't return serverlessOnly settings.
      .filter((setting) => (isServerless ? setting.serverlessOnly : !setting.serverlessOnly))
      .map((setting) =>
        withAutoSuggest({
          label: setting.name,
          text: `${setting.name} = `,
          kind: 'Reference',
          detail: setting.description,
          sortText: '1',
        })
      )
  );
}

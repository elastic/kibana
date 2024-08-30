/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MessageDescriptor } from '@formatjs/intl';
import { TranslationInput } from '@kbn/i18n';

export interface FileOutput {
  messages: Record<string, string | { text: string; comment: string }>;
  formats: TranslationInput['formats'];
}

export type Serializer = (
  messages: MessageDescriptor[],
  formats?: TranslationInput['formats']
) => string;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AlertProvidedActionVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { RULE_TAGS_TEMPLATE } from './constants';

describe('contants', () => {
  describe('tags', () => {
    it('uses the same string as the public directory', () => {
      expect(`{{${AlertProvidedActionVariables.ruleTags}}}`).toEqual(RULE_TAGS_TEMPLATE);
    });
  });
});

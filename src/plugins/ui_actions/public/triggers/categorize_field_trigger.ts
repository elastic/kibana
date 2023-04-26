/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Trigger } from '.';

export const CATEGORIZE_FIELD_TRIGGER = 'CATEGORIZE_FIELD_TRIGGER';
export const categorizeFieldTrigger: Trigger = {
  id: CATEGORIZE_FIELD_TRIGGER,
  title: 'Run pattern analysis',
  description: 'Triggered when user wants to run pattern analysis on a field.',
};

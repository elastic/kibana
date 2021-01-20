/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Trigger } from '.';

export const DEFAULT_TRIGGER = '';
export const defaultTrigger: Trigger = {
  id: DEFAULT_TRIGGER,
  title: 'Unknown',
  description: 'Unknown trigger.',
};

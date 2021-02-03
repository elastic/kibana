/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Trigger } from '.';

export const VISUALIZE_FIELD_TRIGGER = 'VISUALIZE_FIELD_TRIGGER';
export const visualizeFieldTrigger: Trigger = {
  id: VISUALIZE_FIELD_TRIGGER,
  title: 'Visualize field',
  description: 'Triggered when user wants to visualize a field.',
};

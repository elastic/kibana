/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Trigger } from '../../../ui_actions/public';

export const VISUALIZE_EDITOR_TRIGGER = 'VISUALIZE_EDITOR_TRIGGER';
export const visualizeEditorTrigger: Trigger = {
  id: VISUALIZE_EDITOR_TRIGGER,
  title: 'Convert legacy visualizations to Lens',
  description: 'Triggered when user navigates from a legacy visualization to Lens.',
};

export const ACTION_CONVERT_TO_LENS = 'ACTION_CONVERT_TO_LENS';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SenseEditor } from './sense_editor';
import * as core from '../legacy_core_editor';

export function create(element: HTMLElement) {
  const coreEditor = core.create(element);
  const senseEditor = new SenseEditor(coreEditor);

  /**
   * Init the editor
   */
  senseEditor.highlightCurrentRequestsAndUpdateActionBar();
  return senseEditor;
}

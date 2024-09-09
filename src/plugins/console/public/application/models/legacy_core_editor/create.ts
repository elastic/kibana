/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ace from 'brace';
import { LegacyCoreEditor } from './legacy_core_editor';

export const create = (el: HTMLElement) => {
  const actions = document.querySelector<HTMLElement>('#ConAppEditorActions');
  if (!actions) {
    throw new Error('Could not find ConAppEditorActions element!');
  }
  const aceEditor = ace.edit(el);
  return new LegacyCoreEditor(aceEditor, actions);
};

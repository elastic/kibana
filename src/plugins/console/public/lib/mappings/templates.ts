/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpSetup } from '@kbn/core/public';
import { retrieveSettings } from './settings';
import type { SettingsToRetrieve } from './settings';

let legacyTemplates: string[] = [];
let indexTemplates: string[] = [];
let componentTemplates: string[] = [];

export function getLegacyTemplates() {
  return [...legacyTemplates];
}

export function getIndexTemplates() {
  return [...indexTemplates];
}

export function getComponentTemplates() {
  return [...componentTemplates];
}

export function loadLegacyTemplates(templatesObject = {}) {
  legacyTemplates = Object.keys(templatesObject);
}

export function loadIndexTemplates(data: { index_templates?: [] }) {
  indexTemplates = (data.index_templates ?? []).map(({ name }) => name);
}

export function loadComponentTemplates(data: { component_templates?: [] }) {
  componentTemplates = (data.component_templates ?? []).map(({ name }) => name);
}

export async function retrieveTemplates(http: HttpSetup, settingsToRetrieve: SettingsToRetrieve) {
  const _legacyTemplates = await retrieveSettings(http, 'legacyTemplates', settingsToRetrieve);
  const _indexTemplates = await retrieveSettings(http, 'indexTemplates', settingsToRetrieve);
  const _componentTemplates = await retrieveSettings(
    http,
    'componentTemplates',
    settingsToRetrieve
  );

  if (_legacyTemplates) {
    loadLegacyTemplates(_legacyTemplates);
  }

  if (_indexTemplates) {
    loadIndexTemplates(_indexTemplates);
  }

  if (_componentTemplates) {
    loadComponentTemplates(_componentTemplates);
  }
}

export function clearTemplates() {
  legacyTemplates = [];
  indexTemplates = [];
  componentTemplates = [];
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { SettingsToRetrieve } from './settings';
import { retrieveSettings } from './settings';

let dataStreams: string[] = [];

export function getDataStreams() {
  return [...dataStreams];
}

export function loadDataStreams(data: { data_streams?: [] }) {
  dataStreams = (data.data_streams ?? []).map(({ name }) => name);
}

export async function retrieveDataStreams(http: HttpSetup, settingsToRetrieve: SettingsToRetrieve) {
  const _dataStreams = await retrieveSettings(http, 'dataStreams', settingsToRetrieve);

  if (_dataStreams) {
    loadDataStreams(_dataStreams);
  }
}

export function clearDataStreams() {
  dataStreams = [];
}

export class DataStreams {
  constructor(private data: string[] = []) {}

  get = () => {
    return this.data;
  };

  load = (data: { data_streams: [] }) => {
    this.data = (data.data_streams ?? []).map(({ name }) => name);
  };

  clear = () => {
    this.data = [];
  };
}

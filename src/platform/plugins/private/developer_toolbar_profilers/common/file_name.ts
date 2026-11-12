/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProfileType } from './constants';

const FILE_EXTENSIONS: Readonly<Record<ProfileType, string>> = {
  cpu: 'cpuprofile',
  memory: 'heapprofile',
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Returns the file name for a profile started at `date`, e.g. `kibana-cpu-profile-2026-11-02_11-28.cpuprofile`. */
export function getProfileFileName(type: ProfileType, date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}-${pad(date.getMinutes())}`;
  return `kibana-${type}-profile-${day}_${time}.${FILE_EXTENSIONS[type]}`;
}

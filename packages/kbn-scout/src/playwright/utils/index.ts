/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { Config } from '../../config';
import { tagsByMode } from '../tags';

export const serviceLoadedMsg = (name: string) => `scout service loaded: ${name}`;

export const isValidUTCDate = (date: string): boolean => {
  return !isNaN(Date.parse(date)) && new Date(date).toISOString() === date;
};

export function formatTime(date: string, fmt: string = 'MMM D, YYYY @ HH:mm:ss.SSS') {
  return moment.utc(date, fmt).format();
}

export const getPlaywrightGrepTag = (config: Config): string => {
  const serversConfig = config.getTestServersConfig();
  return serversConfig.serverless
    ? tagsByMode.serverless[serversConfig.projectType!]
    : tagsByMode.stateful;
};

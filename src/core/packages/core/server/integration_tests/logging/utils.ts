/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Util from 'util';
const readFile = Util.promisify(Fs.readFile);

function replaceAllNumbers(input: string) {
  return input.replace(/\d/g, 'x');
}

function replaceTimestamp(input: string) {
  return input.replace(/\[(.*?)\]/, (full, key) => `[${replaceAllNumbers(key)}]`);
}

function stripColors(input: string) {
  return input.replace(/\u001b[^m]+m/g, '');
}

function normalizePlatformLogging(input: string) {
  return replaceTimestamp(input);
}

function normalizeLegacyPlatformLogging(input: string) {
  return replaceTimestamp(stripColors(input));
}

export function getPlatformLogsFromMock(logMock: jest.SpyInstance<string, string[]>) {
  return logMock.mock.calls.map(([message]) => message).map(normalizePlatformLogging);
}

export function getLegacyPlatformLogsFromMock(stdoutMock: jest.SpyInstance<string, Buffer[]>) {
  return stdoutMock.mock.calls
    .map(([message]) => message)
    .map(String)
    .map(normalizeLegacyPlatformLogging);
}

export async function getPlatformLogsFromFile(path: string) {
  const fileContent = await readFile(path, 'utf-8');
  return fileContent
    .split('\n')
    .map((s) => normalizePlatformLogging(s))
    .join('\n');
}

export async function getLegacyPlatformLogsFromFile(path: string) {
  const fileContent = await readFile(path, 'utf-8');
  return fileContent
    .split('\n')
    .map((s) => normalizeLegacyPlatformLogging(s))
    .join('\n');
}

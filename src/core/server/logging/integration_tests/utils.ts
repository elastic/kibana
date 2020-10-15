/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

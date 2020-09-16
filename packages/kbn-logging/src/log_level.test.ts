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

import { LogLevel } from './log_level';

const allLogLevels = [
  LogLevel.Off,
  LogLevel.Fatal,
  LogLevel.Error,
  LogLevel.Warn,
  LogLevel.Info,
  LogLevel.Debug,
  LogLevel.Trace,
  LogLevel.All,
];

test('`LogLevel.All` supports all log levels.', () => {
  for (const level of allLogLevels) {
    expect(LogLevel.All.supports(level)).toBe(true);
  }
});

test('`LogLevel.Trace` supports `Trace, Debug, Info, Warn, Error, Fatal, Off`.', () => {
  const supportedLevels = [
    LogLevel.Off,
    LogLevel.Fatal,
    LogLevel.Error,
    LogLevel.Warn,
    LogLevel.Info,
    LogLevel.Debug,
    LogLevel.Trace,
  ];

  for (const level of allLogLevels) {
    expect(LogLevel.Trace.supports(level)).toBe(supportedLevels.includes(level));
  }
});

test('`LogLevel.Debug` supports `Debug, Info, Warn, Error, Fatal, Off`.', () => {
  const supportedLevels = [
    LogLevel.Off,
    LogLevel.Fatal,
    LogLevel.Error,
    LogLevel.Warn,
    LogLevel.Info,
    LogLevel.Debug,
  ];

  for (const level of allLogLevels) {
    expect(LogLevel.Debug.supports(level)).toBe(supportedLevels.includes(level));
  }
});

test('`LogLevel.Info` supports `Info, Warn, Error, Fatal, Off`.', () => {
  const supportedLevels = [
    LogLevel.Off,
    LogLevel.Fatal,
    LogLevel.Error,
    LogLevel.Warn,
    LogLevel.Info,
  ];

  for (const level of allLogLevels) {
    expect(LogLevel.Info.supports(level)).toBe(supportedLevels.includes(level));
  }
});

test('`LogLevel.Warn` supports `Warn, Error, Fatal, Off`.', () => {
  const supportedLevels = [LogLevel.Off, LogLevel.Fatal, LogLevel.Error, LogLevel.Warn];

  for (const level of allLogLevels) {
    expect(LogLevel.Warn.supports(level)).toBe(supportedLevels.includes(level));
  }
});

test('`LogLevel.Error` supports `Error, Fatal, Off`.', () => {
  const supportedLevels = [LogLevel.Off, LogLevel.Fatal, LogLevel.Error];

  for (const level of allLogLevels) {
    expect(LogLevel.Error.supports(level)).toBe(supportedLevels.includes(level));
  }
});

test('`LogLevel.Fatal` supports `Fatal, Off`.', () => {
  const supportedLevels = [LogLevel.Off, LogLevel.Fatal];

  for (const level of allLogLevels) {
    expect(LogLevel.Fatal.supports(level)).toBe(supportedLevels.includes(level));
  }
});

test('`LogLevel.Off` supports only itself.', () => {
  for (const level of allLogLevels) {
    expect(LogLevel.Off.supports(level)).toBe(level === LogLevel.Off);
  }
});

test('`fromId()` correctly converts string log level value to `LogLevel` instance.', () => {
  expect(LogLevel.fromId('all')).toBe(LogLevel.All);
  expect(LogLevel.fromId('trace')).toBe(LogLevel.Trace);
  expect(LogLevel.fromId('debug')).toBe(LogLevel.Debug);
  expect(LogLevel.fromId('info')).toBe(LogLevel.Info);
  expect(LogLevel.fromId('warn')).toBe(LogLevel.Warn);
  expect(LogLevel.fromId('error')).toBe(LogLevel.Error);
  expect(LogLevel.fromId('fatal')).toBe(LogLevel.Fatal);
  expect(LogLevel.fromId('off')).toBe(LogLevel.Off);
});

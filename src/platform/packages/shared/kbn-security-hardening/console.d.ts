/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const unsafeConsole: {
  debug: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  };
  error: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  };
  info: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  };
  log: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  };
  trace: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  };
  warn: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  };
};

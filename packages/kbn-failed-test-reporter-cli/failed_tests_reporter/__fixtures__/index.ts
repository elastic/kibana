/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = jest.requireActual('fs');

export const FTR_REPORT = Fs.readFileSync(require.resolve('./ftr_report.xml'), 'utf8');
export const JEST_REPORT = Fs.readFileSync(require.resolve('./jest_report.xml'), 'utf8');
export const MOCHA_REPORT = Fs.readFileSync(require.resolve('./mocha_report.xml'), 'utf8');
export const CYPRESS_REPORT = Fs.readFileSync(require.resolve('./cypress_report.xml'), 'utf8');

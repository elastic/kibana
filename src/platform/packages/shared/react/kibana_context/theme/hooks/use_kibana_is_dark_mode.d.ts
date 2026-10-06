/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A **temporary** hook to simplify getting `isDarkMode` from eui context
 *
 * TODO: Replace with hook directly from eui
 * See https://github.com/elastic/eui/issues/8693
 */
export declare const useKibanaIsDarkMode: () => boolean;

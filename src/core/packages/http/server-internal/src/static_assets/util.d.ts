/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare function removeSurroundingSlashes(pathname: string): string;
export declare function suffixPathnameToURLPathname(urlString: string, pathname: string): string;
/**
 * Appends a value to pathname. Pathname is assumed to come from URL.pathname
 * Also do some quality control on the path to ensure that it matches URL.pathname.
 */
export declare function suffixPathnameToPathname(pathnameA: string, pathnameB: string): string;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const extractImageInfo: ((image: string) => Promise<any>) &
  import('lodash').MemoizedFunction;
export declare function getImageVersion(image: string): Promise<string | null>;
export declare function getCommitUrl(image: string): Promise<string | null>;
export declare function getServerlessImageTag(image: string): Promise<string | null>;

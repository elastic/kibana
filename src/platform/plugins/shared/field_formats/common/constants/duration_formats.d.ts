/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const DEFAULT_DURATION_INPUT_FORMAT: {
  text: string;
  kind: string;
};
export declare const DEFAULT_DURATION_OUTPUT_FORMAT: {
  text: string;
  method: string;
};
export declare const DURATION_INPUT_FORMATS: {
  text: string;
  kind: string;
}[];
export declare const DURATION_OUTPUT_FORMATS: (
  | {
      text: string;
      method: string;
      shortText?: undefined;
    }
  | {
      text: string;
      shortText: string;
      method: string;
    }
)[];

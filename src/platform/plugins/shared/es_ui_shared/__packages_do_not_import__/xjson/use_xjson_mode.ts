/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, Dispatch } from 'react';

import { collapseLiteralStrings, expandLiteralStrings } from './json_xjson_translation_tools';

interface ReturnValue {
  xJson: string;
  setXJson: Dispatch<string>;
  convertToJson: typeof collapseLiteralStrings;
}

export const useXJsonMode = (json: Record<string, any> | string | null): ReturnValue => {
  const [xJson, setXJson] = useState(() =>
    json === null
      ? ''
      : expandLiteralStrings(typeof json === 'string' ? json : JSON.stringify(json, null, 2))
  );

  return {
    xJson,
    setXJson,
    convertToJson: collapseLiteralStrings,
  };
};

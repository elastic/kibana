/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Completion } from 'openai-api';

export const getResponse = (completion: Completion): string => {
  const firstChoice = completion.data.choices[0].text;
  const sanitized = firstChoice.replace(/\\n/g, '\n');
  return sanitized;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getApiKey = (): string => {
  // Load your key from an environment variable or secret management service
  // (do not include your key directly in your code)
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (OPENAI_API_KEY == null) {
    throw new TypeError(
      'OpenAI key was not found, please configure your .env file or by setting "export OPEN_API_KEY=<your key>"'
    );
  }
  return OPENAI_API_KEY;
};

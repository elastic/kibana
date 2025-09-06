/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fetch from 'node-fetch';

export async function callLLM(model: string, prompt: string): Promise<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM API error: ${response.status} ${response.statusText} - ${errText}`);
  }

  const text = await response.text();

  const lines = text.split('\n').filter(Boolean);

  let responseText = '';
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.response) {
        responseText += parsed.response;
      }
    } catch {
      // ignore parse errors for partial stream chunks
    }
  }

  if (!responseText.trim()) {
    throw new Error('LLM API returned empty response');
  }

  return responseText;
}

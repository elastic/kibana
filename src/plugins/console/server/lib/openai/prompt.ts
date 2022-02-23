/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import OpenAI from 'openai-api';
import { getResponse } from './get_response';

export interface PromptOpts {
  openai: OpenAI;
  promptContent: string;
  userInput: string;
  stop: string[];
  echoUserInput: boolean;
}

export const prompt = async ({
  openai,
  promptContent,
  userInput,
  stop,
  echoUserInput, // TODO: Remove this echoUserInput
}: PromptOpts): Promise<string> => {
  const userPrompt = `${promptContent}${userInput}`;
  const gptResponse = await openai.complete({
    engine: 'code-davinci-001',
    // engine: 'code-cushman-001',
    prompt: userPrompt,
    maxTokens: 500,
    temperature: 0.0,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
    bestOf: 1,
    n: 1,
    stream: false,
    stop,
  });
  return getResponse(gptResponse);
};

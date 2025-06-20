/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import * as cliProgress from 'cli-progress';

export async function getVerbNounFromFunctionName(
  functionName: string,
  progress: cliProgress.SingleBar
): Promise<{
  verb: string;
  noun: string;
  context: string;
}> {
  progress.update({ foo: `Getting verb and noun for function ${functionName}...` });

  const start = Date.now();

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'devstral:latest',
      prompt: `Here is a function name:

        ${functionName}

        Get the verb, the noun and the context from this function name.
  
        The verb should be the action the function performs, the noun should be the main object it operates on, the context should be any additional information related to the verb or noun.

        Please provide the following information as **strict JSON**.
        
        The JSON should include: 
        - "verb" (string)
        - "noun" (string) 
        - "context" (string) 

        **Important:** 
        - Do not include any explanations.
        - DO NOT include your thinking process.
        - NEVER include the function code in the response.
        - Make sure the JSON is valid and parseable.
        - Do not wrap the JSON in any other format, such as markdown or code blocks.

        Correct:
        {
          "verb": "Generate",
          "noun": "Data",
          "clusters": "For Observability Clusters",
        }

        Incorrect:
        \`\`\`json
        {
          "verb": "Generate",
          "noun": "Data",
          "clusters": "For Observability Clusters",
        }
        \`\`\`
        `,

      stream: false,
    }),
  });

  const data = await response.json();

  try {
    const parsed = JSON.parse(data.response);
    if (typeof parsed.verb !== 'string' || typeof parsed.noun !== 'string') {
      throw new Error('Invalid response format from Ollama');
    }
    const end = Date.now();
    const elapsed = ((end - start) / 1000).toFixed(2);

    progress.update({ foo: `Got a summary in ${elapsed}s` });

    return parsed;
  } catch (error) {
    console.log(`Error parsing Ollama response for ${functionName}:`, error);
    return {
      verb: `Failed to get verb for ${functionName}`,
      noun: `Failed to get noun for ${functionName}`,
      context: `Failed to get context for ${functionName}`,
    };
  }
}

async function callOllama(
  functionName: string,
  functionCode: string,
  progress?: cliProgress.SingleBar
) {
  progress?.update({ foo: `Summarizing function ${functionName}...` });
  const start = Date.now();
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'devstral:latest',
      prompt: `Here is a typescript function:
        ${functionCode}

        Summarize this function.

        Please provide the following information as **strict JSON**.
        
        The JSON should include: 
        - "intent" (string): a concise description of the intent of the function. Start with "${functionName} is a function that ..." . Do not use more than 150 characters.>
        - "description" (string) A detailed description of the function. Include the parameters and return variable names in your answer. Keep it to a maximum of 350 characters.

        **Important:** 
        - Do not include any explanations.
        - DO NOT include your thinking process.
        - NEVER include the function code in the response.
        - Make sure the JSON is valid and parseable.
        - Do not wrap the JSON in any other format, such as markdown or code blocks.

        Correct:
        {
          "intent": "getVariables is a function that returns default variables with optional overrides.",
          "description": "This function takes an optional array of feature IDs as input, checks their compatibility with AllAvailableConnectorFeatures, and returns the resulting set of compatible connector features.",
        }

        Incorrect:
        \`\`\`json
        {
          "intent": "getVariables is a function that returns default variables with optional overrides.",
          "description": "This function takes an optional array of feature IDs as input, checks their compatibility with AllAvailableConnectorFeatures, and returns the resulting set of compatible connector features.",
        }
        \`\`\`
        `,

      stream: false,
    }),
  });

  const data = await response.json();

  try {
    const parsed = JSON.parse(data.response);
    if (typeof parsed.intent !== 'string' || typeof parsed.description !== 'string') {
      throw new Error('Invalid response format from Ollama');
    }
    const end = Date.now();
    const elapsed = ((end - start) / 1000).toFixed(2);
    progress?.update({ foo: `Got a summary in ${elapsed}s` });
    return parsed;
  } catch (error) {
    console.log(`Error parsing Ollama response for ${functionName}:`, error);

    return {
      intent: `Failed to parse intent for ${functionName}`,
      description: `Failed to parse description for ${functionName}`,
    };
  }
}

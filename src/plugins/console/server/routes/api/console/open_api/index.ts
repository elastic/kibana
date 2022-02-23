/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import OpenAI from 'openai-api';
import path from 'path';
import { readPromptFile } from '../../../../lib/openai/read_prompt_file';
import { RouteDependencies } from '../../../';
import { prompt } from '../../../../lib/openai/prompt';
import { getApiKey } from '../../../../lib/openai/get_api_key';

const openApiKey = getApiKey();
const openai = new OpenAI(openApiKey);
const promptContent = readPromptFile('elastic_query.txt');

console.log('prompt content is:', promptContent);
console.log('static path is:', path.join(__dirname, '../dist'));

export const registerOpenAIRoute = ({ router, services }: RouteDependencies): void => {
  console.log('REGISTERED ENDPOINT');
  router.post(
    { path: '/api/console/openai', validate: { body: schema.object({}, { unknowns: 'allow' }) } },
    async (ctx, req, res) => {
      const body: { input: string } = req.body as { input: string };
      console.log('--> body: ', body);
      console.log('--> input: ', body.input);
      const suggest = await prompt({
        openai,
        promptContent,
        userInput: body.input,
        stop: ['\n\n'],
        echoUserInput: false,
      });
      console.log('--> Outgoing suggestion is:', suggest);
      return res.ok({ body: { items: [{ text: suggest }] } });
    }
  );
};

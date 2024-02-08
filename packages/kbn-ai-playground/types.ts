/*
 *
 *  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 *  * or more contributor license agreements. Licensed under the Elastic License
 *  * 2.0; you may not use this file except in compliance with the Elastic License
 *  * 2.0.
 *
 */

import { SecurityPluginStart } from '@kbn/security-plugin/public';

export enum MessageRole {
  'user' = 'user',
  'assistant' = 'assistant',
  'system' = 'system',
}

export interface Message {
  id: string;
  content: string | React.ReactNode;
  createdAt?: Date;
  role: MessageRole;
}

export enum ChatFormFields {
  question = 'question',
  citations = 'citations',
  prompt = 'prompt',
}

export interface ChatForm {
  [ChatFormFields.question]: string;
  [ChatFormFields.prompt]: string;
  [ChatFormFields.citations]: boolean;
}

export interface AIPlaygroundPluginStartDeps {
  security: SecurityPluginStart;
}

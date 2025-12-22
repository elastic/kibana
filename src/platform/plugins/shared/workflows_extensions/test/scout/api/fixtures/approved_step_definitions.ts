/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * APPROVED STEP DEFINITIONS
 *
 * This list must be kept up-to-date with all registered step definitions.
 * When a new step is registered, developers must:
 * 1. Add the step ID and handler hash to this list (alphabetically sorted)
 * 2. Get approval from the workflows-eng team
 *
 * If the handler implementation changes, the handler hash must be updated, and get the approval again.
 *
 * Example of an approved step definition entry:
 * {
 *   id: 'example.setVariable',
 *   handlerHash: '3af06ca579302a96b18923de3ce7d04433519528e6eec309cb8a937be6514cda',
 * },
 */
export const APPROVED_STEP_DEFINITIONS: Array<{ id: string; handlerHash: string }> = [
  {
    id: 'ai.prompt',
    handlerHash: 'fa1e9cfa78ed6c6cbebabe3533286b88ff9b3715dfb1b64b3d460251f72f9838',
  },
  {
    id: 'data.dedupe',
    handlerHash: '16c3b3d67e68e77e66ed68869790a4388423a5b4b5aa8a194035f3ff52192836',
  },
  {
    id: 'data.map',
    handlerHash: '6e795a15958a869b328bc8a19836958eafaf088fad7a20a377617fff453dc513',
  },
  {
    id: 'data.regex_extract',
    handlerHash: '3f731f567822df66224c6dcabf669aa78e8c7d36ff130998660c81ed214fd69a',
  },
  {
    id: 'data.regex_replace',
    handlerHash: '741983a2b4f7b4588b8e329681236b572d9c3d505429474cd268a54f4975d967',
  },
  {
    id: 'onechat.runAgent',
    handlerHash: '601727d71e669530e8ba222ae72d3c8a549145d3ea2e8f6a3dd5109d93e1ceff',
  },
];

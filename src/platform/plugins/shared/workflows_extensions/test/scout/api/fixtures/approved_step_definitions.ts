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
    handlerHash: '302d9b6b0a9c2381c2465ebc64b807cd5e6f1a8ce8ad4edf6e621b6813162d54',
  },
  {
    id: 'data.regex_replace',
    handlerHash: 'a3011757ba269b23d0215bd549ab5e7c2100f69245c8b832fb8e372363578b79',
  },
  {
    id: 'onechat.runAgent',
    handlerHash: '601727d71e669530e8ba222ae72d3c8a549145d3ea2e8f6a3dd5109d93e1ceff',
  },
];

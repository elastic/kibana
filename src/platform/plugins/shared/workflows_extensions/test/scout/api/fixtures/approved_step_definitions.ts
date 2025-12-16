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
    handlerHash: 'f6e60f4b0b0b3981e0238c6fa7e9eefd39a69674e09af78dc98c41227e59eafe',
  },
  {
    id: 'data.map',
    handlerHash: 'bd3e22adbb7a0ddaf0822f9acd96bd2f5c5f0b6e4381f7363feb1680a0825298',
  },
  {
    id: 'data.set',
    handlerHash: '4a34418a8e34ad366570cfc3c60b67375c684feacb2c7bfa3cb48b239cc2f99e',
  },
  {
    id: 'onechat.runAgent',
    handlerHash: '4f61ed4415041b7423c43fb4a2ef0d19032360092cef14b99587c2003ba7667e',
  },
];

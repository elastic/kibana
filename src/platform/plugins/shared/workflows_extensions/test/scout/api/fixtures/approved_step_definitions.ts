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
    id: 'ai.agent',
    handlerHash: 'affaf17569853b40868f907f0d6ea4f2a13f55c1f264e29ae59244b45596af28',
  },
  {
    id: 'ai.classify',
    handlerHash: '544ebbf2b32840510958ced5ddc6109712a11b260ab22d13fa8c83d5265aa481',
  },
  {
    id: 'ai.prompt',
    handlerHash: 'a9315bd19fcf4c2ac4d05f652a52bc1c8073b9a7d2dd289a69bedabb827f3249',
  },
  {
    id: 'ai.summarize',
    handlerHash: 'aa1db14ff6af424a3f66f5528e18c7b8d1f462ca8ba8e6feb01221e6fa1518ea',
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
    handlerHash: 'ab7b47758fa93b773f537351149845c8b60c22ae10efd0e1c592406170bb3cb6',
  },
  {
    id: 'data.regex_replace',
    handlerHash: '95c4970a0154de57472d394bc05514c6dcc483b74abb008b2950a5816398aaae',
  },
  {
    id: 'search.rerank',
    handlerHash: '2bdde599ac1b8f38faecbd72a2d17a3d7b2740b874e047e92e9c30ba0ff01a4f',
  },
];

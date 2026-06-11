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
    id: 'contextEngine.addEntry',
    handlerHash: 'c3df9dbab67f6e32344d90cc8c5a9d997b061687e6c42f0f8f755d7c45455711',
  },
  {
    id: 'ai.agent',
    handlerHash: 'ee8c280a01262305768e617ba97723d50c1c13fd01f620825bece394aaf48ee6',
  },
  {
    id: 'ai.classify',
    handlerHash: '0dcc5fb63038d1cb5fe73dd7ae7744d3eb3dda9d95d7e1dd860e587926177553',
  },
  {
    id: 'ai.prompt',
    handlerHash: '3b7be086fd3479a81113a1d1f0bcc37e3e7f008e8fa5eaa2c905bf4b4a3b5ca6',
  },
  {
    id: 'ai.summarize',
    handlerHash: 'f4337c9b87598cd32c2b4a78494f4f015c655873b65f6e4ca981104ea432a2b0',
  },
  {
    id: 'data.aggregate',
    handlerHash: '6f224b6b7a31f3b4b1facc210bf464ca6540eb63f6a03a2793b88f965e3a876c',
  },
  {
    id: 'data.concat',
    handlerHash: '611abd1e703d35528dd7dae76aa178aec0b02201a3a8cb26156ee9d9f03baa13',
  },
  {
    id: 'data.dedupe',
    handlerHash: '4e3712f3f47dc44a733d2d962b8323e05ca9ca8b5c73b4ca4b89d2a2645cde95',
  },
  {
    id: 'data.filter',
    handlerHash: '42139d6a33796b17bfbf8b4955987fade26cb60e3a24cb741f6e5c08fb7c9611',
  },
  {
    id: 'data.find',
    handlerHash: 'c998d0fcc849f88c657cc208d8613f356876765e1b484841ee4ccf513a6570f0',
  },
  {
    id: 'data.map',
    handlerHash: '06462a317dce4d05e72e292df9a209ff099fb523a69ed3fd136b64c8abe9d65b',
  },
  {
    id: 'data.parseJson',
    handlerHash: '1f0fec35b9b4c0560fc52642535d438f3d1df744d76742f4565bf9114f42483b',
  },
  {
    id: 'data.regexExtract',
    handlerHash: 'cf209d493a84da12da6c997a420bbc5db7c638b13d30ac846fa340f9b2dfbe1c',
  },
  {
    id: 'data.regexReplace',
    handlerHash: 'c4b852f5746aed68b3465f7925e38e560bf350e479abf8eead909ffc0f0df7c0',
  },
  {
    id: 'data.stringifyJson',
    handlerHash: 'b84edc967669a557af96b25d554c9800b9103fd6d2f2d54453e4697a9263d52d',
  },
  {
    id: 'search.rerank',
    handlerHash: '2bdde599ac1b8f38faecbd72a2d17a3d7b2740b874e047e92e9c30ba0ff01a4f',
  },
  {
    id: 'security.buildAlertEntityGraph',
    handlerHash: '90e95df7b6deaa5b6ab908c1ff8f4a3606b6e8f7fce5d59e0411d3d577d0be44',
  },
  {
    id: 'security.renderAlertNarrative',
    handlerHash: '1719b8db582f3695a5bac6df5434285f101ebf4fa032702613f28dd33d978988',
  },
  {
    id: 'cases.addAlerts',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.addComment',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.addEvents',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.addObservables',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.addTags',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.assignCase',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.closeCase',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.createCase',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.createCaseFromTemplate',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.deleteCases',
    handlerHash: '4fcd80128a7d6abe2da1645deae2823e4912271a49c0c9ba3e4121112ad0cd34',
  },
  {
    id: 'cases.deleteObservable',
    handlerHash: '0222a4609fe11df28447a5e4637db381ffdc5818a47ae34b3ff54ec8c0ef56e5',
  },
  {
    id: 'cases.findCases',
    handlerHash: 'e787e07fa01ca1f3f1ea070faeb78cd50447d1e02184aedcb2dd0d49aa9c6816',
  },
  {
    id: 'cases.findSimilarCases',
    handlerHash: 'bc0f49aff3be36fbea2f169aa9bdd082b2cee5240af16b2f54ee9b931dee8412',
  },
  {
    id: 'cases.getAllAttachments',
    handlerHash: '32dc3d6f6e918e1cd89b6864bf275bfee7eb6de81e8eb3434d6b8e2c5b9af9b1',
  },
  {
    id: 'cases.getCase',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.getCases',
    handlerHash: 'f101c5ddc9e9f52611453c186a5ca1d33019e0ce4823c18c244deb7351928680',
  },
  {
    id: 'cases.getCasesByAlertId',
    handlerHash: '0066f40a84dad03c0d745e43f342b72cc42a2d4ac3207533a9f7fe0695d79b78',
  },
  {
    id: 'cases.setCategory',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.setCustomField',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.setDescription',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.setSeverity',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.setStatus',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.setTitle',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.unassignCase',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.updateCase',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
  {
    id: 'cases.updateCases',
    handlerHash: 'd5b3622761a1c9a654a26b50f3f3f74c2d784d4ba8267dd21667d2014c94141b',
  },
  {
    id: 'cases.updateObservable',
    handlerHash: '1704c6d46ccb5432e1df6c24f7ebde8d4b1686c007dcaf6a5c5cac02b0222e3e',
  },
];

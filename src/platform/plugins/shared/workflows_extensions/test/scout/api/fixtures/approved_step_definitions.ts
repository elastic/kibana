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
    handlerHash: 'ee8c280a01262305768e617ba97723d50c1c13fd01f620825bece394aaf48ee6',
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
    id: 'data.aggregate',
    handlerHash: '0223bec699354d5878732a6ebcb99a2b4b43a28b4f01da293df1ab7165c33e00',
  },
  {
    id: 'data.concat',
    handlerHash: '611abd1e703d35528dd7dae76aa178aec0b02201a3a8cb26156ee9d9f03baa13',
  },
  {
    id: 'data.dedupe',
    handlerHash: '16c3b3d67e68e77e66ed68869790a4388423a5b4b5aa8a194035f3ff52192836',
  },
  {
    id: 'data.filter',
    handlerHash: '829a245561a33b2f8349755a4ff6b4a2953774b6f862a7a0228b93f517742c9a',
  },
  {
    id: 'data.find',
    handlerHash: 'b23058c153f427b8a8cb4a9ee1ed8c06881e3d2ed291ea7e78846e113aa0301d',
  },
  {
    id: 'data.map',
    handlerHash: '79ddef521ebd6ae8278e5d9034b7005687e31c2e949796add213eff2ebd21d82',
  },
  {
    id: 'data.parseJson',
    handlerHash: 'f1de4bd3d12fc65492d01d59dc63af5df68f23031376b9f78738ecda2fb2067c',
  },
  {
    id: 'data.regexExtract',
    handlerHash: 'ab7b47758fa93b773f537351149845c8b60c22ae10efd0e1c592406170bb3cb6',
  },
  {
    id: 'data.regexReplace',
    handlerHash: '95c4970a0154de57472d394bc05514c6dcc483b74abb008b2950a5816398aaae',
  },
  {
    id: 'data.stringifyJson',
    handlerHash: '827bdbb31e4e493bc7746809a6e32f9d9248a05e7d1810a39c5db9a0fe1970ca',
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

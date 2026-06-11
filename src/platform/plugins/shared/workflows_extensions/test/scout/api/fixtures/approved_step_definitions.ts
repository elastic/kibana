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
 *   definitionHash: '3af06ca579302a96b18923de3ce7d04433519528e6eec309cb8a937be6514cda',
 * },
 */
export const APPROVED_STEP_DEFINITIONS: Array<{ id: string; definitionHash: string }> = [
  {
    id: 'contextEngine.addEntry',
    definitionHash: 'b4142fd4dab88d471f233d992a07a385a75175877fe49934de8be98ee4f95cd9',
  },
  {
    id: 'ai.summarize',
    definitionHash: '7a62bf4b082654ecc49385bc2bf77a22ee1e66962e3538344be0f0160c53a1df',
  },
  {
    id: 'ai.agent',
    definitionHash: 'eba36bce77787187038a381f671566348b91f15a7db588c074afed9a83c14e25',
  },
  {
    id: 'ai.classify',
    definitionHash: '91a1522a8b78bd043ebebf794495e75b3214e8ff0fdcabd8ab67dab7599b8b5f',
  },
  {
    id: 'ai.prompt',
    definitionHash: '6ff6b5e2b2e311068f1b18df31a21829d4db2a0420a38d5d3139a869e8ac7354',
  },
  {
    id: 'contextEngine.addEntry',
    definitionHash: 'b4142fd4dab88d471f233d992a07a385a75175877fe49934de8be98ee4f95cd9',
  },
  {
    id: 'data.aggregate',
    definitionHash: 'd41449cf88ea4e8887b156720a08148e317ad0c685eb5b3b4624f6dd6f164164',
  },
  {
    id: 'data.concat',
    definitionHash: 'b5ed2f5656bb62b3f59a35f8fdb7c1f813c299180f95efc227e28e0a67dd2583',
  },
  {
    id: 'data.dedupe',
    definitionHash: '692ad7052865f50bbbc05e0cd7554801f8049c1a0bb75ffd670955af87f74852',
  },
  {
    id: 'data.filter',
    definitionHash: '81b2f0de4d322fa7ae431c562e1ed476238fb64d23a3c8590aa86ebfc62d021f',
  },
  {
    id: 'data.find',
    definitionHash: '55de05515461383a76d75cb1ff2a66730d26e7ced22d549611511390733d17f1',
  },
  {
    id: 'data.map',
    definitionHash: '133d9f679704c1813a4afab63dbbaff501d022eb0d63d8b37490dad719b0f4a8',
  },
  {
    id: 'data.parseJson',
    definitionHash: 'f3a1a82c3f1f7a44376bdb329299758ee93cd910fc9d41e04d65e145af4be4d7',
  },
  {
    id: 'data.regexExtract',
    definitionHash: '0d74d9e0aabf958a9bcd332b41efcd916afe9d343030405df4f56c0644abb9ae',
  },
  {
    id: 'data.regexReplace',
    definitionHash: '425901910c3c7a231ce4aba7d560bd7bb362000998a32bd9cdc6a314790c933e',
  },
  {
    id: 'data.stringifyJson',
    definitionHash: '9b757bc004832849780d0292ce8bddebd4e2a1698b05cf6edaff99c49d6dc042',
  },
  {
    id: 'search.rerank',
    definitionHash: 'b0dec1d0037ac61d32d268bf5fdc7d645a7faed446cde9be1ada57f46a0fdd9c',
  },
  {
    id: 'security.buildAlertEntityGraph',
    definitionHash: '90e95df7b6deaa5b6ab908c1ff8f4a3606b6e8f7fce5d59e0411d3d577d0be44',
  },
  {
    id: 'security.renderAlertNarrative',
    definitionHash: '1719b8db582f3695a5bac6df5434285f101ebf4fa032702613f28dd33d978988',
  },
  {
    id: 'cases.addAlerts',
    definitionHash: '8f081af827e83cff7f6db5c8df2c4bbd521c429f36fe0e2e5f15600f906d1eb2',
  },
  {
    id: 'cases.addComment',
    definitionHash: 'c77b18222f780bed5aa3ae3655fdb797a66549a55928d664805f6c1ef6382b18',
  },
  {
    id: 'cases.addEvents',
    definitionHash: 'd0820a46d9cefd3e5d82bc15b5bcd17fcb6ab9932ff92b512825ac42c0c23427',
  },
  {
    id: 'cases.addObservables',
    definitionHash: '65449e203fd5fd69cac4ca120830861370bfdf2656d40125e6d865dc3b193e43',
  },
  {
    id: 'cases.addTags',
    definitionHash: '1677752a44d87d24c0de4d0edddf2ba971e5c3a839aed1c67aa4ccaed1921696',
  },
  {
    id: 'cases.assignCase',
    definitionHash: '2f1014d986994ee9e5490331845b33d53f806e5709465c086fbb1672bac5be80',
  },
  {
    id: 'cases.closeCase',
    definitionHash: '0a72dccc6e76740bffdd6357a81cd1fb28cc6a702fb7327322f9744d129a7d20',
  },
  {
    id: 'cases.createCase',
    definitionHash: '7d31390fe896a479cb76931385bbd98bbcf5be084872126a23095de851e370d6',
  },
  {
    id: 'cases.createCaseFromTemplate',
    definitionHash: 'b5c8fd7660daf976b9c3501f5ddfd7625277d6e96fed61adc7aa94f15fb8260a',
  },
  {
    id: 'cases.deleteCases',
    definitionHash: 'c9a72f13a08c6549631c2727a3452e796be944293f9236c14336f0ff624bfa36',
  },
  {
    id: 'cases.deleteObservable',
    definitionHash: '494285f9b07153849607d24467edf66e6a7b0c15353ed63f1e4c42942418dc1e',
  },
  {
    id: 'cases.findCases',
    definitionHash: '660d0814cd8796f06b8e5b085ac6aa2a1388e22697dbd46fc221eee436b9cb0e',
  },
  {
    id: 'cases.findSimilarCases',
    definitionHash: 'e05cb816e1e69ecadbc4920426cd7188821386ee6cf8c6fb1cb18d35745c1574',
  },
  {
    id: 'cases.getAllAttachments',
    definitionHash: '9e45466d24c36435e99a8f45dd7f9279c18ccaa47d7f3e2db2e395191ed87a18',
  },
  {
    id: 'cases.getCase',
    definitionHash: '708d11de3598f2cc4eccefc2eb896ff8cc258d1f1e522e1117287921ae0e3dd6',
  },
  {
    id: 'cases.getCases',
    definitionHash: 'e63ff2befbf48d6ef116b6caa45d005b1b4926e3cbe822f9562386c863d6d4d5',
  },
  {
    id: 'cases.getCasesByAlertId',
    definitionHash: '8964d33b95ba40446121be3b8d13921dd7b04259b99ec9276ac59af3aa620e23',
  },
  {
    id: 'cases.setCategory',
    definitionHash: 'c3aa019733cb99c4026c55d290103ac5665f9bd7ee438772ef2a41baa391af17',
  },
  {
    id: 'cases.setCustomField',
    definitionHash: '9a2720c93ce0620193ad38140f83373366852d1001be758638d3ee24dee050ec',
  },
  {
    id: 'cases.setDescription',
    definitionHash: 'bcee0efa60a7b202339dcc1f709a3bc2fba47f7b980213aa02e9ac5910abefd6',
  },
  {
    id: 'cases.setSeverity',
    definitionHash: '5c96cf7244b62f4e6d8df7e3e613f736657f8914b4d10b0fe6bd01ea7f18dfa2',
  },
  {
    id: 'cases.setStatus',
    definitionHash: '81559ae94b31d342cc1f65e22a6dd4b32070fae731273aee49234d83f15b2e29',
  },
  {
    id: 'cases.setTitle',
    definitionHash: '85e2254957b16ce436f7282c9e47050c9f02fb5238ed389339a1792c173a2e4d',
  },
  {
    id: 'cases.unassignCase',
    definitionHash: 'dc88e43b956945a1507b58dcd01252a5561996e6c2d5699d9a0b922c514ce7ce',
  },
  {
    id: 'cases.updateCase',
    definitionHash: '4085679b00ca2b261e2b244ab7cc5e0c67390092ae47c7904c4afd7bc6362a79',
  },
  {
    id: 'cases.updateCases',
    definitionHash: '129f66ab82fde1510d1974be7cb325ddc62dcd97853b12f72b8353b9aa0b84a6',
  },
  {
    id: 'cases.updateObservable',
    definitionHash: '2b7a1a374aa9730f80e5b032e32b16c2da01eda472cb712277c5234cfcfd4d62',
  },
  {
    id: 'data.aggregate',
    definitionHash: 'd41449cf88ea4e8887b156720a08148e317ad0c685eb5b3b4624f6dd6f164164',
  },
  {
    id: 'data.concat',
    definitionHash: 'b5ed2f5656bb62b3f59a35f8fdb7c1f813c299180f95efc227e28e0a67dd2583',
  },
  {
    id: 'data.dedupe',
    definitionHash: '692ad7052865f50bbbc05e0cd7554801f8049c1a0bb75ffd670955af87f74852',
  },
  {
    id: 'data.filter',
    definitionHash: '81b2f0de4d322fa7ae431c562e1ed476238fb64d23a3c8590aa86ebfc62d021f',
  },
  {
    id: 'data.find',
    definitionHash: '55de05515461383a76d75cb1ff2a66730d26e7ced22d549611511390733d17f1',
  },
  {
    id: 'data.map',
    definitionHash: '133d9f679704c1813a4afab63dbbaff501d022eb0d63d8b37490dad719b0f4a8',
  },
  {
    id: 'data.parseJson',
    definitionHash: 'f3a1a82c3f1f7a44376bdb329299758ee93cd910fc9d41e04d65e145af4be4d7',
  },
  {
    id: 'data.regexExtract',
    definitionHash: '0d74d9e0aabf958a9bcd332b41efcd916afe9d343030405df4f56c0644abb9ae',
  },
  {
    id: 'data.regexReplace',
    definitionHash: '425901910c3c7a231ce4aba7d560bd7bb362000998a32bd9cdc6a314790c933e',
  },
  {
    id: 'data.stringifyJson',
    definitionHash: '9b757bc004832849780d0292ce8bddebd4e2a1698b05cf6edaff99c49d6dc042',
  },
  {
    id: 'search.rerank',
    definitionHash: 'b0dec1d0037ac61d32d268bf5fdc7d645a7faed446cde9be1ada57f46a0fdd9c',
  },
];

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
 * 1. Add the step ID and definition hash to this list (alphabetically sorted)
 * 2. Get approval from the workflows-eng team
 *
 * If the definition changes, the definitionHash must be updated and get the approval again.
 *
 * Example of an approved step definition entry:
 * {
 *   id: 'example.setVariable',
 *   definitionHash: '3af06ca579302a96b18923de3ce7d04433519528e6eec309cb8a937be6514cda',
 * },
 */
export const APPROVED_STEP_DEFINITIONS: Array<{ id: string; definitionHash: string }> = [
  {
    id: 'ai.agent',
    definitionHash: '14056a04764cf7f51a137a3be9a55399658e8a239050aa1d41f1edb347bb7718',
  },
  {
    id: 'ai.classify',
    definitionHash: '42a6e085b66c6498204cb7f7667eebcef638e4fe8c591ae1ca73c301adc38fd5',
  },
  {
    id: 'ai.prompt',
    definitionHash: '295d71e1ce9c2a28896122111efd68f0f4f321a8518bd8d7f12e28d30429d72c',
  },
  {
    id: 'ai.summarize',
    definitionHash: '491907dfcc9e2f3b5cffbe76fd085d12b1b4c2718abacc3725d1de00d73b8f0c',
  },
  {
    id: 'cases.addAlerts',
    definitionHash: 'fd18727e9f55bad3a04cbb4b1bf9ff3eb183cb04e3d2d1e813773a15225199b3',
  },
  {
    id: 'cases.addComment',
    definitionHash: '103f1047c301f889627dfb1f7ae4b1697f8ba22116f39fc3f63083a7c956ea97',
  },
  {
    id: 'cases.addEvents',
    definitionHash: '67b7c36699c1ecf5e690da66830fc3639aa277df6c8f05921b15ac4e137b2893',
  },
  {
    id: 'cases.addObservables',
    definitionHash: '71aefd7eab1c08d27aa92aed06e68ae1202b39062fbf3f0aaf9aeee59499d31d',
  },
  {
    id: 'cases.addTags',
    definitionHash: 'eabdee1df0b39965f1b5118d54c600e3c9ff6329cd92920a0d53c2546a7411d5',
  },
  {
    id: 'cases.assignCase',
    definitionHash: '40a44fbce1272fa091f407b1901591ebb987aad867d37a50d4b1e5a870a3c5ce',
  },
  {
    id: 'cases.closeCase',
    definitionHash: 'bd7916c990b86b62b2574c1d49b831bdfd39e80f3d29ff3cb598fc7109d40a8d',
  },
  {
    id: 'cases.createCase',
    definitionHash: '92d92ccff73282eec34843f37cf3273ba6de77b023a546d0df1cac72c5dd101e',
  },
  {
    id: 'cases.createCaseFromTemplate',
    definitionHash: 'bdf2bd00216b002143163f2ea80b4b274cf18a8c0347c790ae6cb2bb2c5355bf',
  },
  {
    id: 'cases.deleteCases',
    definitionHash: '99cb4b9014e4db6889b1b925a6da6c66e5c01e48b05a364449052500ef7e2b1e',
  },
  {
    id: 'cases.deleteObservable',
    definitionHash: '967d52e604185ae79718b5fa6264137dbd3cedabfd53af4027cea2ab41119b05',
  },
  {
    id: 'cases.findCases',
    definitionHash: 'c4edc5ca3dd6108e2d2b2b2b3d81a97201a6ab35a81f84b872dc9aa365ed7462',
  },
  {
    id: 'cases.findSimilarCases',
    definitionHash: '5501802c1b00ff42e81d419e976834cc2104f0be4515239eb6da9ce5ec9990c9',
  },
  {
    id: 'cases.getAllAttachments',
    definitionHash: 'e61101efb7f75c14beff99452e368e57f42a6f3c0df76293c046f99314a23b13',
  },
  {
    id: 'cases.getCase',
    definitionHash: '334a5ce30df1b08feab7df9033643e9c9f65c53d0984adb57021800669652b89',
  },
  {
    id: 'cases.getCases',
    definitionHash: 'bbfa8fdd41c752db25cac0e57e1ff38274b439b88f2c038d53a8b7bd0d9eaa9c',
  },
  {
    id: 'cases.getCasesByAlertId',
    definitionHash: '01ef121556e7628fc07b81502f07e2c3239bbb1085fb26555d0c3a3e3f365806',
  },
  {
    id: 'cases.setCategory',
    definitionHash: 'e80dd980810d77938866ef49418c7cd92cfaf2c0b529c59ea73518061ae8351c',
  },
  {
    id: 'cases.setCustomField',
    definitionHash: 'd8dd2ce700cc0258abb2f35d549c5afa317153f6dd8c36eb219c9ce0eb21d818',
  },
  {
    id: 'cases.setDescription',
    definitionHash: '8040bdf85373f0ec1194b16d8de33e2f8b7fa573e0d0d61f0deb913e36890090',
  },
  {
    id: 'cases.setSeverity',
    definitionHash: '544c5920b599ef08f5bcb977ef367cb8391d4a17f17b1f7e1650338a071d81d5',
  },
  {
    id: 'cases.setStatus',
    definitionHash: '838d840359dac89ceced05fa9800a19abe0bd2f1d217b6c0591fa343e71ba0c2',
  },
  {
    id: 'cases.setTitle',
    definitionHash: '1106a298e8e5932d29dc1c6e19d9b0a21f472f9f4e17884e0ecf9d4fb0bcf8ce',
  },
  {
    id: 'cases.unassignCase',
    definitionHash: 'e6b835da63bf370696bc596072fe9ef9bbcf1a2d3c39257df6575add2c1a3eda',
  },
  {
    id: 'cases.updateCase',
    definitionHash: '8867b90de837c553df87760f5dc0dc04d9ec9f1308a53b389bfdc9c3369e05b5',
  },
  {
    id: 'cases.updateCases',
    definitionHash: '4628e05a3898d18b236fae1aae00e3eb8841c5b17960a2fe62f799f02dd3d981',
  },
  {
    id: 'cases.updateObservable',
    definitionHash: '8ea2eb35798e8d96c5fa72e09f2d972f90f559328a2f21ada7f22911764f2611',
  },
  {
    id: 'contextEngine.addEntry',
    definitionHash: '27066f4163f528c6fad426f1f8010303c61a067aa13014a2eb667b70adfd6a4a',
  },
  {
    id: 'data.aggregate',
    definitionHash: '2e91a3dc65f717b90c805e28b7e17c8229434647e3548a35900832f046a518ff',
  },
  {
    id: 'data.concat',
    definitionHash: '1c3411a3433b1a051fc6ff24b89bf655ccfd6758f97732ee18f04e45f0013e03',
  },
  {
    id: 'data.dedupe',
    definitionHash: '8885829b29be280571db6989965056bef7d4f938053b71c3a0ef4a4c152f07fd',
  },
  {
    id: 'data.filter',
    definitionHash: 'ae5f130a3597dd9e26b771a7e53963e2c488dafcb1dd377902a857dcbbc222fa',
  },
  {
    id: 'data.find',
    definitionHash: 'e0e415be61efab115ff3d2b4851ad7932554a19a58ca760cdde38aabb235ed33',
  },
  {
    id: 'data.map',
    definitionHash: '29af91190145cbc9b4a4e61f4c5176822422496890a9b7bae511a93db6d5261b',
  },
  {
    id: 'data.parseJson',
    definitionHash: 'd238d5ff4e8f0d64ee1a1e90fc6d3f93bb7ae9c23913506b1194c7cd7199b1a2',
  },
  {
    id: 'data.regexExtract',
    definitionHash: 'ef999e26cd8b48149191a25319f0f2399ce921afedea5ef9218a442dc0bd710d',
  },
  {
    id: 'data.regexReplace',
    definitionHash: '2ff24e8982417d09526c47659268add9210fb8b157201477ca074804fffae765',
  },
  {
    id: 'data.stringifyJson',
    definitionHash: 'ae09a6d6b6a815e50f039caef5ee8d403cc11c94f6b5ffb09eb04982645aaccd',
  },
  {
    id: 'search.rerank',
    definitionHash: 'c989f0b20019b12079d797d11b122285552e3b863ef96aaddad81640f0c2a951',
  },
  {
    id: 'security.setAlertStatus',
    definitionHash: 'cb1720032b9f90a53888a08fe7d7a75e0ca274d572e3effad7760cea7e5bc5d8',
  },
  {
    id: 'security.setAlertTags',
    definitionHash: '796fad87f50df911e346d1d9d9dbb49508314ec2a328d7a9459992bebe343caf',
  },
];

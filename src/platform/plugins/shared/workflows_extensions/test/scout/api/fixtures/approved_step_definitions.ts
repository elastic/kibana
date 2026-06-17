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
    definitionHash: '61369039c2fe1fe7d1c32f9b378c3042d267200e6640a7a0f35de42fd2d98350',
  },
  {
    id: 'ai.classify',
    definitionHash: '8407ff204c11e5a92e8abf80ef4107055fca368c0db955f1ca282ad1120f90b7',
  },
  {
    id: 'ai.prompt',
    definitionHash: '55e06b9c76f49b058af63146454d61f49b5c8f5055b34a2d2473825f67cfa95c',
  },
  {
    id: 'ai.summarize',
    definitionHash: 'e9e8f647b159477f7a86c66ad4360f99ecbe8e5a04a3dd890241c82e047f9f1c',
  },
  {
    id: 'cases.addAlerts',
    definitionHash: 'e7af7342bb64c98d6f800d9bd087895b190665fafa62dec4bbe7a9011eccbe63',
  },
  {
    id: 'cases.addComment',
    definitionHash: 'b23896df7ed1d1b822ecc1a13d4f3870b522b1fb0e9f0e8b00830586b48cf865',
  },
  {
    id: 'cases.addEvents',
    definitionHash: '1ac93d32f2b9dbb846631d6a70a116eaf4aa5f63575fe266d3cc61e9c3e08cf3',
  },
  {
    id: 'cases.addObservables',
    definitionHash: 'c48517c8bcd1bb522b3d2f26c548addccdf9380e053038ee461be01588870e10',
  },
  {
    id: 'cases.addTags',
    definitionHash: '2712c32e51937cec6cd345d66199f2124552575cd62c82228e301e6e61556ee7',
  },
  {
    id: 'cases.assignCase',
    definitionHash: 'ea0a58b6b67da252a03da3b98f4f8a623898df562fb9d457067dbbd06b61a3f8',
  },
  {
    id: 'cases.closeCase',
    definitionHash: '14f14abe3112cc15825ea87ef3fbb4b83efd9c741a80470afabebac70fd22631',
  },
  {
    id: 'cases.createCase',
    definitionHash: '672366fbfea17a4cd1925cf670f54b88dff7fab1bc533310c82155a25c0633b1',
  },
  {
    id: 'cases.createCaseFromTemplate',
    definitionHash: '6d181f590abe24ed2bd90a96d9e9b550d69f91bf12483c6fe39131374a80f317',
  },
  {
    id: 'cases.deleteCases',
    definitionHash: '965740f2f3404fe6f6c6bbc00aee286d953979efde71ef70e6af6bb40471be11',
  },
  {
    id: 'cases.deleteObservable',
    definitionHash: '6f487f2ebdcdd64c744d9ee12f3b568be6aa02fc1bf0cefe659dd6bca8fc7e7e',
  },
  {
    id: 'cases.findCases',
    definitionHash: '965ebe10b4fa8a8eaf9b25a148d45f241f91641fc7a946e20828d86932d37faf',
  },
  {
    id: 'cases.findSimilarCases',
    definitionHash: '7726628309927cae609e46418b58a74b6b561fd2e8201e4e35e70c3dfcb502a5',
  },
  {
    id: 'cases.getAllAttachments',
    definitionHash: 'a0e3d2d3a13f7a7cbda809fbd229263a0eeb750d7d649eb413553d683b6dc4aa',
  },
  {
    id: 'cases.getCase',
    definitionHash: 'f9c74d3d87ae6f2831ee6683630dfc8c5941af57f8a199c6348a561d34b7c1ca',
  },
  {
    id: 'cases.getCases',
    definitionHash: '5d82b91d9026a593bdd4feb217b6d95806e4767c95057f6632fb05c886abc20d',
  },
  {
    id: 'cases.getCasesByAlertId',
    definitionHash: 'bd5681887038f8f9f12925d5937e949b292249aa07e8c38ff3eb4853911a0fb6',
  },
  {
    id: 'cases.setCategory',
    definitionHash: 'a78432b7b4396bb8ad9a6821ffbfdeef12135525e849ff48c70f5830ab6a18dc',
  },
  {
    id: 'cases.setCustomField',
    definitionHash: '4743e7ebb05a662caa089c2596edf6887b0665f67073dede6de28fc696e108e1',
  },
  {
    id: 'cases.setDescription',
    definitionHash: '9a0c215cc18d148bb5adebaf05c0b5dccdfe19d2d23ce1e0a65ffad4319e1cc3',
  },
  {
    id: 'cases.setSeverity',
    definitionHash: 'fd56121168eb7a421ae1abb7df157c1fa4caaf580c3237d3a1c049d3279c3e4d',
  },
  {
    id: 'cases.setStatus',
    definitionHash: '4aca8036029f78ff80f03d570bee29b99d80c1fbb3a6f852faab173f1d1f5f0c',
  },
  {
    id: 'cases.setTitle',
    definitionHash: '8801e5a666bb602080902eb3dbeb7f1f3ac30b8ade25d9b8970bebe4dda9e686',
  },
  {
    id: 'cases.unassignCase',
    definitionHash: '72528fca13e6d700b9f4b427f34fcd663de7544987d56b81f7c736ec29a0be9d',
  },
  {
    id: 'cases.updateCase',
    definitionHash: '60b60a7c5297bed7eb972023b0d9c79473e4fd74a3884003b5699897f2e723e4',
  },
  {
    id: 'cases.updateCases',
    definitionHash: '449a100444a79338810d35c980ffd7bea989994c2f0b985a93dac55055a88d46',
  },
  {
    id: 'cases.updateObservable',
    definitionHash: 'f869b6ec966f20dea5849a5dc3704a260acf5adb2f405b2abd982220ac4d5cee',
  },
  {
    id: 'contextEngine.addEntry',
    definitionHash: 'fa99a999886acaf3f1d265deca68a061b6f3faff5a4660a51b53251d4034ba09',
  },
  {
    id: 'data.aggregate',
    definitionHash: '0bc378ad029c1bda64f5cccbf2eea1b49ab39d97edbc10e5c5eec738225d9fb6',
  },
  {
    id: 'data.concat',
    definitionHash: '1f0823873f56f116471918bba33ef23a0d74bd113e7622eebac379435bf75b89',
  },
  {
    id: 'data.dedupe',
    definitionHash: 'a38e8a91e37074ca26888c2e6031b6cea5074aa7d2b688145edc4a72a5882b92',
  },
  {
    id: 'data.filter',
    definitionHash: '3f0453765900a7bd9efb2caaab696a1407de1dc15e7746a95079d55c9b70fdac',
  },
  {
    id: 'data.find',
    definitionHash: '5ef06fe7654b638c6889ec96a7a646f78c3628378bede1564d2a8c612f4372ff',
  },
  {
    id: 'data.map',
    definitionHash: '01a51fe7acf4f5cf427059440ec31598d68c0e46ef11d82e45e151150556cad8',
  },
  {
    id: 'data.parseJson',
    definitionHash: 'f2354927ea46792aeeeff4fa1861af49656e0bffb4c09cbfa590431f29c9cd1f',
  },
  {
    id: 'data.regexExtract',
    definitionHash: '0312bd460e7ff8d2f7725d3e8f4c7d5d96ae606a9cc5901f02d09108466d596a',
  },
  {
    id: 'data.regexReplace',
    definitionHash: '7cd36dc8b3f4f37bc87f7d2ca8b3588c37ff538fdf6925804ae3ca60fc1f9f6e',
  },
  {
    id: 'data.stringifyJson',
    definitionHash: '6773f5c609999c0e8da36397dc1243aa94c2392a1f00ca2f084fd4d1fd2235e2',
  },
  {
    id: 'workflows.publicApiAccess',
    definitionHash: 'f50346b6b4f1fa5e087456baf0360b34304e33198b23980c4214496ff6834b54',
  },
  {
    id: 'search.rerank',
    definitionHash: '9e032776f7f7342dd252eee237e17a89adf5185f515d4fa890560bb8a42d4601',
  },
];

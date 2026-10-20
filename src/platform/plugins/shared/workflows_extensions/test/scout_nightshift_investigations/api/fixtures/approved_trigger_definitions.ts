/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * APPROVED TRIGGER DEFINITIONS
 *
 * This list is the full catalog of registered trigger definitions. The Scout
 * suite under `test/scout_nightshift_investigations` boots the
 * `nightshift_investigations` config set so gated plugins are enabled and every
 * registered trigger is present.
 *
 * When a new trigger is registered, developers must:
 * 1. Add the trigger ID and schema hash to this list (alphabetically sorted)
 * 2. Get approval from the workflows-eng team
 * 3. If registration is gated by a plugin `enabled` config that is not already
 *    on in the `nightshift_investigations` Scout config set
 *    (`classic.stateful.config.ts`), add that flag there. Do not add flags
 *    that already default to `true` on stateful (for example
 *    `xpack.alerting_v2.enabled` and `xpack.significantEvents.enabled`).
 *
 * If the event schema changes, the schema hash must be updated, and get the approval again.
 *
 * Example of an approved trigger definition entry:
 * {
 *   id: 'cases.updated',
 *   schemaHash: 'a1b2c3d4e5f6...',
 * },
 *
 * To get the schemaHash for a trigger: run this suite (or start the server with
 * `--serverConfigSet nightshift_investigations`), then GET
 * internal/workflows_extensions/trigger_definitions and copy the schemaHash
 * from the response for the trigger id.
 */
export const APPROVED_TRIGGER_DEFINITIONS: Array<{ id: string; schemaHash: string }> = [
  {
    id: 'ai.attachmentAdded',
    schemaHash: 'c82f96366f59ded38993b577bbeea35d01d916dc9403881636f193c4ccf39526',
  },
  {
    id: 'ai.attachmentDeleted',
    schemaHash: '1867659824969a51ef31fb3f7a808a1dfec1cccc0beb8976eb94a4c7a5b701ae',
  },
  {
    id: 'ai.attachmentUpdated',
    schemaHash: '73a6023bf61fccf1dab6d9f6a35f028e6b89d054565444262a3e7da734fbe1d1',
  },
  {
    id: 'ai.conversation.metadataUpdated',
    schemaHash: '3ddfb053989618f32071989376a39b001b3ed1bead0e81bf9f48c20253a53c57',
  },
  {
    id: 'ai.conversation.updated',
    schemaHash: '56e3a676eb337ba1384fa50792dfeea9d2c77d23b92b3caded8a3cefc8141ca1',
  },
  {
    id: 'alerting.actions.alertAcked',
    schemaHash: '4d4610d1b9e373ebb499bcd869422085d603f4518c2c2e684a31a571f2a2e954',
  },
  {
    id: 'alerting.actions.alertActivated',
    schemaHash: '136c0fcf0b387b97bac050127c4b14244efd82a31400d28fc4cd2837fae330ca',
  },
  {
    id: 'alerting.actions.alertAssigned',
    schemaHash: 'bdbe4b8494809fa5e3a5311440aa4ff485bae7a2acd6d8989489aec8c36a279d',
  },
  {
    id: 'alerting.actions.alertDeactivated',
    schemaHash: 'bb9a246794512ad64c03b1da1a61f727fa6b64083d0bd4860c3bf02b2ee03c4f',
  },
  {
    id: 'alerting.actions.alertSnoozed',
    schemaHash: 'a13f06208bb87f375480ca8f6c4c3e00665154bd192080a3a6b43d8d4a20fd26',
  },
  {
    id: 'alerting.actions.alertTagged',
    schemaHash: 'dc756297ccd64a6df4f36a97b293f2da6701687067416e2007be08b8607f799c',
  },
  {
    id: 'alerting.actions.alertUnacked',
    schemaHash: '4d4610d1b9e373ebb499bcd869422085d603f4518c2c2e684a31a571f2a2e954',
  },
  {
    id: 'alerting.actions.alertUnassigned',
    schemaHash: '4d4610d1b9e373ebb499bcd869422085d603f4518c2c2e684a31a571f2a2e954',
  },
  {
    id: 'alerting.actions.alertUnsnoozed',
    schemaHash: '4d4610d1b9e373ebb499bcd869422085d603f4518c2c2e684a31a571f2a2e954',
  },
  {
    id: 'alerting.ruleCreated',
    schemaHash: '2e5bdb73915698a7e5f65fd71b9feab19a60a7273c710b32c591939762bd7084',
  },
  {
    id: 'alerting.ruleDeleted',
    schemaHash: '2e5bdb73915698a7e5f65fd71b9feab19a60a7273c710b32c591939762bd7084',
  },
  {
    id: 'alerting.ruleDisabled',
    schemaHash: '2e5bdb73915698a7e5f65fd71b9feab19a60a7273c710b32c591939762bd7084',
  },
  {
    id: 'alerting.ruleEnabled',
    schemaHash: '2e5bdb73915698a7e5f65fd71b9feab19a60a7273c710b32c591939762bd7084',
  },
  {
    id: 'alerting.ruleEventsGenerated',
    schemaHash: 'c88c0616eebb07a89f0225f4d1f52045eb886c4e14de6598b480389d4cf2d19d',
  },
  {
    id: 'alerting.ruleExecutionFailed',
    schemaHash: 'c6153bb406d59918ee8127e5573ab2cd4715c78ca9f2fa8f4dc4ba6883044224',
  },
  {
    id: 'alerting.ruleUpdated',
    schemaHash: '2e5bdb73915698a7e5f65fd71b9feab19a60a7273c710b32c591939762bd7084',
  },
  {
    id: 'alerting.v1.alertStatusChanged',
    schemaHash: '393ba21ad63d5b65d3b019c299b5f7d9e172d9eea52df67c069413b007c22a7a',
  },
  {
    id: 'cases.attachmentsAdded',
    schemaHash: 'af8917afcff27e816e16aab810bb0295d4ea16931414fc266aa629f220e4592c',
  },
  {
    id: 'cases.attachmentsDeleted',
    schemaHash: 'af15c7003f07847f8e3b553e83925d6a82b2de4a0c66f9ecec4e48957c616ad1',
  },
  {
    id: 'cases.caseCreated',
    schemaHash: '616f3b574681800b6ee48d4809ea220bd2179ddc97a08c72f77171c0844de98b',
  },
  {
    id: 'cases.caseStatusUpdated',
    schemaHash: 'fb77dec382f8f3be96e72d49cd5512f79bf37c8dba3eb11b97603a9acacaedf7',
  },
  {
    id: 'cases.caseUpdated',
    schemaHash: '5f4cb5e0a152336c08a9db71fd74da5557a69e4473e7d98d91166500d6f8a75f',
  },
  {
    id: 'cases.commentsAdded',
    schemaHash: '7e13967e0f1185cbd309f016b25d3631b514706e5217da41f8655e93d23d90c6',
  },
  {
    id: 'cases.extendedFieldsUpdated',
    schemaHash: 'cfb4b84727e79d6826fa8a786b7591ea1a86661c7fff2bb2fa768abbc3aaf37c',
  },
  {
    id: 'cases.observablesAdded',
    schemaHash: '2b1c57a5609d19590cd953edd380d4db7ee6ea2c62c370915b1e71dc98cc0483',
  },
  {
    id: 'datadog.alert',
    schemaHash: '7c96173386337514269164d21db906ce5308554fdd79ebab6694e990269af578',
  },
  {
    id: 'entityStore.entityAssetCriticalityUpdated',
    schemaHash: 'ef5a71ccf64832ea19fda336a36fbf0b8200a1bd4f703d78417075deedb77c3f',
  },
  {
    id: 'entityStore.entityRiskScoreChanged',
    schemaHash: '4607f3ede66bbd24d6200e61707fda9aeaeae4306f0662bce7f52b726f7c75a9',
  },
  {
    id: 'github.check_run',
    schemaHash: '4a778973f314e050abdcdd801bdec543f52484c3dee2fd0abe4bb5c1dc7eb9fa',
  },
  {
    id: 'github.deployment_status',
    schemaHash: '7d020dd8bde181f37759a50c2382730f028f583340ef5f8f6e356aaff94e3f2a',
  },
  {
    id: 'github.issue_comment',
    schemaHash: '91420ef0b4d32a784305ef4471805e4df35349b3449e4e5f65f51f980a92b0c0',
  },
  {
    id: 'github.issues',
    schemaHash: '69c51cdd26e1939cf258fca3e2f65f8fafba8170212ddab9b6952daaf9c8ac18',
  },
  {
    id: 'github.pull_request',
    schemaHash: 'd74f1ae5f843a4e6db37c65d0d1382a7d3cc63dd75f857cfbdd406f8a2408a7f',
  },
  {
    id: 'github.pull_request_review',
    schemaHash: 'd8bbbcfba3ccaf46d69ca14f6320c6d856392778f4537296ef35b69f818a69ac',
  },
  {
    id: 'github.push',
    schemaHash: '0ab734b9fda386baed7eb937ff60f9ce95eae9c8dd51544ac6f3fddb15ffa1ee',
  },
  {
    id: 'github.release',
    schemaHash: '736a857d680d2a1e2556c3bd804f7bb8d91640fc2a70cfb7d5caf52cfbee9e39',
  },
  {
    id: 'inboundWebhook.received',
    schemaHash: '836b11abd1b232d2b66d895cb6ea2e9874879393897bda6a349ebcfe9c1019bb',
  },
  {
    id: 'microsoft-teams.channel_created',
    schemaHash: '926143328fdd7b370147085a41a0e1c697b3cf53adeccb81cabc81cc294c3394',
  },
  {
    id: 'microsoft-teams.channel_message',
    schemaHash: '646abaa545edc0920c85fa2f2222d82e7c99d614841aec90727973637c6b0b26',
  },
  {
    id: 'microsoft-teams.chat_created',
    schemaHash: '4b5b0f53063c7ff1033097c1ce976a2debdf093955bc29b8078f22d04a09bbb0',
  },
  {
    id: 'microsoft-teams.chat_message',
    schemaHash: '8300afbf9effbd77359b068490aa1b22b72b0a318a6227871a258d84ae751755',
  },
  {
    id: 'microsoft-teams.team_member_added',
    schemaHash: '470ea2e42d9ea0a7adb6da3d62f7d181e6e9a95469055f319635bcaf6cdfbe91',
  },
  {
    id: 'nightshift-investigations.completed',
    schemaHash: '9c4a56800d90d397279b9e40a872a64d5cee0a3675556850dc16afa5840d3b9a',
  },
  {
    id: 'nightshift-investigations.failed',
    schemaHash: 'd5e9e788b13edf73d0f57d07f127e63153eb52a0b2dcb6dfdcaf80b751a428ec',
  },
  {
    id: 'nightshift-investigations.started',
    schemaHash: '80cdd17e8634561e45af961d8df628f767dd02e2ed4e44c7ec2d3170bd39839b',
  },
  {
    id: 'security.alertAssigneesChanged',
    schemaHash: '2f73bfc4659d7a78e7f7f9020e5be9ef644df23d4dde94b701871cdc49df48f8',
  },
  {
    id: 'security.alertStatusChanged',
    schemaHash: '975d9066961cad2453415869279d140e23af66ca7e637c04d6c1b22e0eb5b75a',
  },
  {
    id: 'security.alertTagsChanged',
    schemaHash: '350c63009d6e43bb86787622207801d4c0f3f2e9e466583634c2ce4d63ddd79f',
  },
  {
    id: 'security.attackAssigneesChanged',
    schemaHash: 'ab4559cad4bb8cca4f1828f318bf37c0931d2adbf968b05fd6a0713a1b7ffff0',
  },
  {
    id: 'security.attackStatusChanged',
    schemaHash: 'f335fee29e4c6ede819550ad725a0fdc25d84e655b4ae7557856524a76dfc1d3',
  },
  {
    id: 'security.attackTagsChanged',
    schemaHash: 'd7e515158ccc9d49d7e8d07d7f0c9eb4911adc6ae7819e67f59d612742d9b7d9',
  },
  {
    id: 'security.noteCreated',
    schemaHash: 'ea5ae619dc62034662d523423d67601c66b1e67bdf89ab38425bd20990de5e30',
  },
  {
    id: 'security.noteUpdated',
    schemaHash: '83c558e058984b93c00d27b5a14082f7c0b3051ad6db06dc2e2b9c15b189a987',
  },
  {
    id: 'servicenow_search.change_approval_state_changed',
    schemaHash: '2d9751e1b380681e29f10436d040ff05437cc4190f38fc095248aa83e91773a1',
  },
  {
    id: 'servicenow_search.comment_added',
    schemaHash: 'eee96bcccdb421b53d094e742c007d9323c8184e521f5a9ccb4ad1ce27b980ed',
  },
  {
    id: 'servicenow_search.incident_created',
    schemaHash: '3f4e1d9aeb44f886ae2cc6b44cfca39c338db4686bfaf989702cc758090ffdf1',
  },
  {
    id: 'servicenow_search.incident_resolved',
    schemaHash: 'a7ff02db70098e3cd9dce0bd3c787dd0f05b931270666183bb9ea81ba5accad9',
  },
  {
    id: 'servicenow_search.incident_updated',
    schemaHash: '80f3ce6c946bf4df8972fc5115f2b0abc53564f047a816a37669bca69a3c4861',
  },
  {
    id: 'servicenow_search.work_note_added',
    schemaHash: 'eee96bcccdb421b53d094e742c007d9323c8184e521f5a9ccb4ad1ce27b980ed',
  },
  {
    id: 'significant-events.eventCreated',
    schemaHash: 'c6724b9ea991bf0541f2444d9d966e6ed6f8dcaf73c008f6869c4808832d11aa',
  },
  {
    id: 'significant-events.eventStatusChanged',
    schemaHash: '5d5e07122f98c29f16a1128c42b72e6412c2c048312e019c32a15e4dc81f521a',
  },
  {
    id: 'slack2.app_mention',
    schemaHash: '2b9a3c2f21420860adb283c1a3a7e456eb944218c87bf9923995b19c70ee9400',
  },
  {
    id: 'slack2.channel_created',
    schemaHash: '219a7d0b917886ed2ec550c651f3de9a77e1b03f94e57c6bdefda0baddcb8558',
  },
  {
    id: 'slack2.file_public',
    schemaHash: '11502eaa4d5c21f87ab276c2774efff8f80f0fe31689fe5d5f2bd0938b7b50a7',
  },
  {
    id: 'slack2.file_shared',
    schemaHash: '4aa03b029a6b8c76d826515be349cc5ca606b78b3d79485df76892c8806b0d45',
  },
  {
    id: 'slack2.member_joined_channel',
    schemaHash: '414fd120e30027e7d450f9c11289c005883e69fa2b3835c512f5848799494e28',
  },
  {
    id: 'slack2.message',
    schemaHash: 'ebb7bba37b622893dc2b1fd55b1688fc27cdd0c220d9572c700f72e106c7aab4',
  },
  {
    id: 'slack2.reaction_added',
    schemaHash: 'ce7a24e2c6e45cfa3c306789223a3d619a7ce10dfcb1e688ccd1e830eba14933',
  },
  {
    id: 'slack2.team_join',
    schemaHash: '97130dc33a7879313cc814aab02381cafd68eceef207a198a152e66cde048ba0',
  },
  {
    id: 'workflows.failed',
    schemaHash: '2ac7a279823d7ca59c4d47de93ea7bd7103b1953ea484cef7f489d12d0c81980',
  },
];

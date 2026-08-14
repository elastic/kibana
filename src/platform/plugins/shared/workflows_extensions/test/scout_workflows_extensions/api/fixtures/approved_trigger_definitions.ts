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
 * suite under `test/scout_workflows_extensions` boots the
 * `workflows_extensions` config set so gated plugins are enabled and every
 * registered trigger is present.
 *
 * When a new trigger is registered, developers must:
 * 1. Add the trigger ID and schema hash to this list (alphabetically sorted)
 * 2. Get approval from the workflows-eng team
 * 3. If registration is gated by a plugin `enabled` config that is not already
 *    on in the `workflows_extensions` Scout config set
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
 * `--serverConfigSet workflows_extensions`), then GET
 * internal/workflows_extensions/trigger_definitions and copy the schemaHash
 * from the response for the trigger id.
 */
export const APPROVED_TRIGGER_DEFINITIONS: Array<{ id: string; schemaHash: string }> = [
  {
    id: 'alerting.episodeAcked',
    schemaHash: '53f31d5468c0fb12a49faa3233c78a87837772cb161d1db8072803877bddf3b6',
  },
  {
    id: 'alerting.episodeActivated',
    schemaHash: 'c5a55a218565c7d084269021a9d6252d9ea972a8a9ce496082da5c6e76d09a01',
  },
  {
    id: 'alerting.episodeAssigned',
    schemaHash: 'b99211de1fdabb5e2a2942031495b8c34d317a3feccd7efaa81bf997c0412439',
  },
  {
    id: 'alerting.episodeDeactivated',
    schemaHash: '623ec35bd18482cc9a3bc7a9ecaf3b3de4f203c8cacc207e102b8a5b14fa554a',
  },
  {
    id: 'alerting.episodeSnoozed',
    schemaHash: 'f0517884b4e0560f86a62515c0d84420fed367ef2cfdda501cfedad010f22914',
  },
  {
    id: 'alerting.episodeTagged',
    schemaHash: 'd6ad1872b85995d8088dfacbad85f775236ceb61a3982b077c7a00902c84bf95',
  },
  {
    id: 'alerting.episodeUnacked',
    schemaHash: '53f31d5468c0fb12a49faa3233c78a87837772cb161d1db8072803877bddf3b6',
  },
  {
    id: 'alerting.episodeUnassigned',
    schemaHash: '53f31d5468c0fb12a49faa3233c78a87837772cb161d1db8072803877bddf3b6',
  },
  {
    id: 'alerting.episodeUnsnoozed',
    schemaHash: '53f31d5468c0fb12a49faa3233c78a87837772cb161d1db8072803877bddf3b6',
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
    schemaHash: '809265f7f0af6bdd32df0498a0f756a17220587024df2fe25eb69b0060b38fe1',
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
    id: 'cases.attachmentsAdded',
    schemaHash: 'af8917afcff27e816e16aab810bb0295d4ea16931414fc266aa629f220e4592c',
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
    id: 'entityStore.entityAssetCriticalityUpdated',
    schemaHash: 'ef5a71ccf64832ea19fda336a36fbf0b8200a1bd4f703d78417075deedb77c3f',
  },
  {
    id: 'entityStore.entityRiskScoreChanged',
    schemaHash: '9f825d6e3cd79ed834759edfec89c88eef2be3a3e33b5872f53bddc365915593',
  },
  {
    id: 'nightshift-investigations.completed',
    schemaHash: '68cd1e9afb5c33b505325d097d77595bf2e30e3222b26a8f0b5f2d3ace99c7ff',
  },
  {
    id: 'nightshift-investigations.failed',
    schemaHash: '391f552b9dfc3214c3f41e8df0c2a255d68478a76277b2aaebba926c9860d5d6',
  },
  {
    id: 'nightshift-investigations.started',
    schemaHash: '2cfb1c09d421df1f1810116a6c8d477b0c87329e816fef8e5b4fbe828c61b681',
  },
  {
    id: 'significant-events.eventCreated',
    schemaHash: '537230a2eb86302d4a80e93f396effd93681ba4a2e11fd70c5b7b5b56fe4c3fb',
  },
  {
    id: 'significant-events.eventStatusChanged',
    schemaHash: 'f140133a6ecef997484c3d4ef94b326207b4f1124cce889d34fef6e38fa019fe',
  },
  {
    id: 'securitySolution.alertAssigneesChanged',
    schemaHash: '2e8a234de11a0923538dff405d7afebee9ac8937d83b6da99aadd25af6791cf5',
  },
  {
    id: 'securitySolution.alertStatusChanged',
    schemaHash: '24c7aecfc6dc92c4a61ec6246a339f75b372c7de64c5f7bbc80d50c8c6878794',
  },
  {
    id: 'securitySolution.alertTagsChanged',
    schemaHash: '942a7dc9e430cb7bc1c545ed877e6ff3f259bcf3ffc440b59bb5ef3ddbd2ae77',
  },
  {
    id: 'securitySolution.attackAssigneesChanged',
    schemaHash: 'ecff2d141ee6a8d3cd9022714ab9bef9a64a85c218c330786262b5a7e9343c30',
  },
  {
    id: 'securitySolution.attackStatusChanged',
    schemaHash: '43d74725e0a216f9745d0e1a04e95494addd2635963808d4358d17530779aca3',
  },
  {
    id: 'securitySolution.attackTagsChanged',
    schemaHash: 'be1ada6681a134be4562308e47a07a55d6a6e672b87e9dffd49b684e610a0a30',
  },
  {
    id: 'securitySolution.noteCreated',
    schemaHash: 'cc25972c9a7956404837ea9572a1a6325af1d2f684207d383d0f8a85c752cf20',
  },
  {
    id: 'securitySolution.noteUpdated',
    schemaHash: 'e1d6db5f3b1d43dc184425716c7f880f05ae3ec819eb44a2102c36c28225ea1b',
  },
  {
    id: 'workflows.failed',
    schemaHash: '2ac7a279823d7ca59c4d47de93ea7bd7103b1953ea484cef7f489d12d0c81980',
  },
];

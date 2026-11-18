/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * TEMPORARY: steps registered on the server but not yet on the client, which predate the
 * client registration check. Do NOT add new entries: register the public step definition instead.
 * Remove an entry in the same PR that registers the step on the client; the check fails
 * for entries that are registered on both sides.
 *
 * Tracked in https://github.com/elastic/kibana/issues/305608
 */
export const CLIENT_REGISTRATION_EXCEPTIONS: readonly string[] = [
  // @elastic/nightshift — nightshift_investigations
  'nightshift.composeHydrateNotifications',
  'nightshift.decisionTreeHydrate',
  'nightshift.decisionTreePrepare',
  'nightshift.decisionTreeReinforce',
  'nightshift.ensureInvestigationAgent',
  'nightshift.followUpRecoveredAlert',
  'nightshift.handleInvestigationFailure',
  'nightshift.memoryMaterializeToSandbox',
  'nightshift.memoryOptimize',
  'nightshift.obtainSandbox',
  'nightshift.onlineEvals.classifyRound',
  'nightshift.onlineEvals.score',
  'nightshift.onlineEvals.scoreMemory',
  'nightshift.renderSlackMessage',
  'nightshift.resolveModel',
  'nightshift.sendNotifications',
  'nightshift.sweepInvestigationFailures',
  'nightshift.triggerInvestigation',
  'nightshift.wikiHydrate',
  'nightshift.wikiOptimize',

  // @elastic/nightshift — significant_events
  'significantEvents.classifyDetections',
  'significantEvents.resolveModel',

  // @elastic/alertzero-common-layer — alertzero
  'alertzero.investigation.summarize',
  'alertzero.resolveProposals',
  'alertzero.triage.groupFpCandidates',
  'alertzero.triage.headroom',
  'alertzero.triage.joinProposal',
  'alertzero.triage.loadAlerts',
  'alertzero.triage.planSweep',
  'alertzero.triage.retagProposalAlerts',
  'alertzero.triage.tagPatternKeys',
  'hunt.packageReport',

  // @elastic/alertzero-common-layer — proposals
  'proposals.getLatestRevision',

  // @elastic/context-eng — context_engine
  'context-engine.applyDreamChanges',
  'context-engine.applyDreamRelationships',
  'context-engine.createKi',
  'context-engine.deleteKi',
  'context-engine.getDreamingStatus',
  'context-engine.getFeedbackContext',
  'context-engine.readTraceTranscripts',
  'context-engine.recordImprovements',
  'context-engine.updateKi',
];

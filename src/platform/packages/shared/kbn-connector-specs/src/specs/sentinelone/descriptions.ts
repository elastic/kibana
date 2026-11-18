/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Action descriptions shown to agents and workflow authors. */
export const ACTION_DESCRIPTIONS = {
  getAgents:
    'Find agents (endpoints) by computerName, ip, uuid, ids or text. Returns id (the agent id for host actions), networkStatus and infected.',
  isolateHost:
    'Network-isolate agents by id (they still reach the console). Returns requested, skipped (already isolated) and notFound; confirm with getAgents.',
  releaseHost:
    'Reconnect isolated agents by id. Returns requested, skipped (already connected) and notFound; confirm with getAgents.',
  executeScript:
    'Run a Script Library script on agents. Returns parentTaskId, or pending when the run needs approval. No undo.',
  getRemoteScriptStatus:
    'Get the per-agent task status of a script run by parentTaskId. Poll until every task has finished.',
  getRemoteScriptResults:
    'Get result download links of finished script tasks by task id. No link means no results.',
  downloadRemoteScriptResults:
    'Download the results file of one script task as base64 content (up to 25 MB).',
  getRemoteScripts: 'List Script Library scripts (id, name, type, OS) by text, ids, OS or scope.',
  fetchAgentFiles:
    'Ask one agent to upload up to 10 files as an encrypted archive; once the upload shows in getActivities (activity type 80), call downloadAgentFile with that activity id.',
  downloadAgentFile:
    'Download the fetchAgentFiles archive by agentId and activityId as base64 content (up to 25 MB).',
  getActivities:
    'Read the activity log by agent, threat, activity type or time, for example to confirm an isolation or upload.',
  mitigateThreat:
    'Kill, quarantine, un-quarantine, remediate or otherwise mitigate threats by id. Remediate is Windows and macOS only; kill and remediate cannot be undone.',
  rollbackThreat: 'Ransomware rollback of threats by id. Windows only; needs a VSS snapshot.',
  getThreats:
    'Search threats (endpoint detections, not alerts) by verdict, status, mitigation, confidence, SHA1, agent, computer or date.',
  updateThreatVerdict:
    'Set the analyst verdict (true_positive, false_positive, ...) of threats by id.',
  updateThreatStatus: 'Set the incident status, and optionally the verdict, of threats by id.',
  addThreatNote:
    'Add a note to threats by id, for example the action taken. Notes cannot be removed.',
  getThreatNotes: 'Read the notes of one threat (text, creator, createdAt).',
  addHashToBlocklist:
    'Block a SHA1 or SHA256 hash for one OS at the smallest scope needed. Check searchBlocklist first.',
  removeHashFromBlocklist: 'Remove blocklist items by id (from searchBlocklist).',
  searchBlocklist:
    'Search blocklisted hashes by exact or partial value or scope; returns the item ids.',
  searchAlerts:
    'Search STAR rule alerts (not threats) by severity, status, verdict, ids, scope or date. Returns alertInfo.alertId and rule details.',
  updateAlertVerdict: 'Set the analyst verdict of alerts by alertId (from searchAlerts).',
  updateAlertStatus: 'Set the incident status of alerts by alertId (from searchAlerts).',
  getSites: 'List sites (id, name, accountId, state) by name or ids, for the siteIds scope.',
  getGroups:
    'List groups (id, name, siteId, type) by name, ids, site, account or type, for the groupIds scope.',
  getAccounts: 'List accounts (id, name, state) by name or ids, for the accountIds scope.',
  createExclusion:
    'Create a path, certificate, browser, file type or hash exclusion at an explicit scope. It stops detection: keep it narrow.',
  listExclusions: 'List exclusions by type, OS, exact or partial value, ids or scope.',
  deleteExclusion: 'Delete exclusions by id (from listExclusions).',
  moveAgent:
    'Move agents by id to a group, for example one with a stricter policy. Returns agentsMoved, skipped (already there) and notFound.',
  fetchThreatFile:
    'Ask SentinelOne to upload the file of one threat, encrypted with your password, then call downloadThreatFile. Needs the Fetch Threat File permission.',
  downloadThreatFile:
    'Download a threat file uploaded by fetchThreatFile as base64 content (up to 25 MB). Fails until the upload exists.',
  initiateScan: 'Start a full disk scan on agents by id; abortScan stops it.',
  abortScan: 'Stop a running full disk scan on agents by id.',
  shutdownAgent:
    'Shut down agents by id. Last resort (prefer isolateHost): a person must restart the host.',
  broadcastMessage: 'Show a short message to the users of agents by id. Windows and macOS only.',
  createIOC:
    'Create one threat-intelligence indicator (hash, IP, domain or URL) at an explicit scope.',
  searchIOCs: 'Search threat-intelligence indicators by value, type, source or scope.',
  deleteIOC: 'Delete threat-intelligence indicators by uuid within one account.',
  getInstalledApplications:
    'List the installed applications of agents by id (full list, no paging).',
  getThreatDetails:
    'Get full records, with indicators, of known threat ids. To search, use getThreats.',
  getThreatTimeline: 'Get the event timeline of one threat, with optional text search.',
  listFirewallRules:
    'List Firewall Control rules by name, action, status, OS or scope. A call with no filter is rejected.',
  createFirewallRule:
    'Create an Allow or Block Firewall Control rule at an explicit scope. Needs the Firewall Control add-on.',
  deleteFirewallRule: 'Delete Firewall Control rules by id (from listFirewallRules).',
  createStarRule:
    'Create a STAR detection rule from an S1QL query at an explicit scope. It is a Draft unless status is Active.',
  updateStarRule:
    'Change fields of one STAR rule by ruleId, keeping the rest. Returns the rule and its previous definition.',
  enableStarRules: 'Activate STAR rules by id, for example a Draft from createStarRule.',
  disableStarRules: 'Disable STAR rules by id; they stop raising alerts.',
  deleteStarRule: 'Delete STAR rules by id. This cannot be undone.',
  runScriptAndWait:
    'Run a script on agents and wait up to waitSeconds. Returns tasks and download links, or timedOut with parentTaskId.',
  getApplicationCves:
    "List the CVEs of one application by applicationIds (one id, from the Application Risk inventory) or applicationName + applicationVendor + applicationVersions; the vendor is HTML-escaped ('&lt;'). severity and nvdBaseScore can be null; totalItems is reliable only on the first page. Ranger Insights allows more ids and filters.",
  runQuery:
    "Run a read-only Singularity Data Lake Power Query (PQ) and return up to 1000 rows. Filter first, then pipes: 'dataSource.name = \"x\" | limit 10'; a bare '*' and S1QL 1.0 queries are invalid. On timedOut, narrow the time range (default 24 hours).",
} as const;

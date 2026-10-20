/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildEventId } from '../../event_type_id';

export const SERVICENOW_SEARCH_CONNECTOR_TYPE_ID = '.servicenow_search' as const;

export const SERVICENOW_INCIDENT_CREATED_EVENT_KEY = 'incident_created' as const;
export const SERVICENOW_INCIDENT_UPDATED_EVENT_KEY = 'incident_updated' as const;
export const SERVICENOW_INCIDENT_RESOLVED_EVENT_KEY = 'incident_resolved' as const;
export const SERVICENOW_COMMENT_ADDED_EVENT_KEY = 'comment_added' as const;
export const SERVICENOW_WORK_NOTE_ADDED_EVENT_KEY = 'work_note_added' as const;
export const SERVICENOW_CHANGE_APPROVAL_STATE_CHANGED_EVENT_KEY =
  'change_approval_state_changed' as const;

export const SERVICENOW_INCIDENT_CREATED_EVENT_ID = buildEventId(
  SERVICENOW_SEARCH_CONNECTOR_TYPE_ID,
  SERVICENOW_INCIDENT_CREATED_EVENT_KEY
);
export const SERVICENOW_INCIDENT_UPDATED_EVENT_ID = buildEventId(
  SERVICENOW_SEARCH_CONNECTOR_TYPE_ID,
  SERVICENOW_INCIDENT_UPDATED_EVENT_KEY
);
export const SERVICENOW_INCIDENT_RESOLVED_EVENT_ID = buildEventId(
  SERVICENOW_SEARCH_CONNECTOR_TYPE_ID,
  SERVICENOW_INCIDENT_RESOLVED_EVENT_KEY
);
export const SERVICENOW_COMMENT_ADDED_EVENT_ID = buildEventId(
  SERVICENOW_SEARCH_CONNECTOR_TYPE_ID,
  SERVICENOW_COMMENT_ADDED_EVENT_KEY
);
export const SERVICENOW_WORK_NOTE_ADDED_EVENT_ID = buildEventId(
  SERVICENOW_SEARCH_CONNECTOR_TYPE_ID,
  SERVICENOW_WORK_NOTE_ADDED_EVENT_KEY
);
export const SERVICENOW_CHANGE_APPROVAL_STATE_CHANGED_EVENT_ID = buildEventId(
  SERVICENOW_SEARCH_CONNECTOR_TYPE_ID,
  SERVICENOW_CHANGE_APPROVAL_STATE_CHANGED_EVENT_KEY
);

/** Value the ServiceNow flow sets on `occurrence` for each named event. */
export const SERVICENOW_OCCURRENCE_INCIDENT_CREATED = 'incident.created' as const;
export const SERVICENOW_OCCURRENCE_INCIDENT_UPDATED = 'incident.updated' as const;
export const SERVICENOW_OCCURRENCE_INCIDENT_RESOLVED = 'incident.resolved' as const;
export const SERVICENOW_OCCURRENCE_COMMENT_ADDED = 'comment.added' as const;
export const SERVICENOW_OCCURRENCE_WORK_NOTE_ADDED = 'work_note.added' as const;
export const SERVICENOW_OCCURRENCE_CHANGE_APPROVAL_STATE_CHANGED =
  'change.approval_state_changed' as const;

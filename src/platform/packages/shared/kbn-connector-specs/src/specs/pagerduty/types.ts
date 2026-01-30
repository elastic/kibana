/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Types for PagerDuty API responses
 */
export interface PagerDutyReference {
  id: string;
  summary?: string;
  type?: string;
  name?: string;
  email?: string;
}

export interface PagerDutyService {
  id: string;
  name?: string;
  summary?: string;
}

export interface PagerDutyAssignment {
  assignee?: PagerDutyReference;
}

export interface PagerDutyAcknowledger {
  acknowledger?: PagerDutyReference;
}

export interface PagerDutyIncident {
  id: string;
  incident_number?: number;
  title?: string;
  description?: string;
  status?: string;
  urgency?: string;
  priority?: {
    id: string;
    name?: string;
    summary?: string;
  };
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  service?: PagerDutyService;
  assignments?: PagerDutyAssignment[];
  acknowledgers?: PagerDutyAcknowledger[];
}

export interface TransformedIncident {
  id: string;
  incident_number?: number;
  title?: string;
  description?: string;
  status?: string;
  urgency?: string;
  priority?: {
    id: string;
    name?: string;
    summary?: string;
  };
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  service?: {
    id: string;
    name?: string;
    summary?: string;
  };
  assignments?: Array<{
    assignee?: {
      id: string;
      summary?: string;
    };
  }>;
  acknowledgers?: Array<{
    acknowledger?: {
      id: string;
      summary?: string;
    };
  }>;
}

export interface PagerDutyIncidentsResponse {
  incident?: PagerDutyIncident;
  incidents?: PagerDutyIncident[];
  limit?: number;
  offset?: number;
  total?: number;
  more?: boolean;
}

export interface TransformedIncidentsResponse {
  incident?: TransformedIncident;
  incidents?: TransformedIncident[];
  limit?: number;
  offset?: number;
  total?: number;
  more?: boolean;
}

export interface PagerDutyTeam {
  id: string;
  name?: string;
  summary?: string;
}

export interface PagerDutyServiceReference {
  id: string;
  name?: string;
  summary?: string;
}

export interface PagerDutyEscalationPolicy {
  id: string;
  name?: string;
  description?: string;
  num_loops?: number;
  on_call_handoff_notifications?: string[];
  teams?: PagerDutyTeam[];
  services?: PagerDutyServiceReference[];
}

export interface TransformedEscalationPolicy {
  id: string;
  name?: string;
  description?: string;
  num_loops?: number;
  on_call_handoff_notifications?: string[];
  teams?: Array<{
    id: string;
    name?: string;
    summary?: string;
  }>;
  services?: Array<{
    id: string;
    name?: string;
    summary?: string;
  }>;
}

export interface PagerDutyAlert {
  id: string;
  type?: string;
  summary?: string;
  created_at?: string;
  status?: string;
  alert_key?: string;
  service?: PagerDutyService;
  body?: {
    type?: string;
    details?: string;
  };
}

export interface TransformedAlert {
  id: string;
  type?: string;
  summary?: string;
  created_at?: string;
  status?: string;
  alert_key?: string;
  service?: {
    id: string;
    name?: string;
    summary?: string;
  };
  body?: {
    type?: string;
    details?: string;
  };
}

export interface PagerDutyNote {
  id: string;
  user?: PagerDutyReference;
  content?: string;
  created_at?: string;
}

export interface TransformedNote {
  id: string;
  user?: {
    id: string;
    summary?: string;
  };
  content?: string;
  created_at?: string;
}

export interface PagerDutySchedule {
  id: string;
  type?: string;
  summary?: string;
  name?: string;
  time_zone?: string;
  description?: string;
  schedule_layers?: Array<{
    id: string;
    name?: string;
    start?: string;
    end?: string;
    rotation_virtual_start?: string;
    rotation_turn_length_seconds?: number;
    users?: Array<{
      user?: PagerDutyReference;
    }>;
  }>;
  users?: PagerDutyReference[];
}

export interface TransformedSchedule {
  id: string;
  type?: string;
  summary?: string;
  name?: string;
  time_zone?: string;
  description?: string;
  schedule_layers?: Array<{
    id: string;
    name?: string;
    start?: string;
    end?: string;
    rotation_virtual_start?: string;
    rotation_turn_length_seconds?: number;
    users?: Array<{
      user?: {
        id: string;
        summary?: string;
        name?: string;
        email?: string;
      };
    }>;
  }>;
  users?: Array<{
    id: string;
    summary?: string;
  }>;
}

export interface PagerDutyOnCall {
  user?: PagerDutyReference;
  escalation_policy?: PagerDutyReference;
  schedule?: PagerDutyReference;
  escalation_level?: number;
  start?: string;
  end?: string;
}

export interface PagerDutyOnCallsResponse {
  oncalls?: PagerDutyOnCall[];
  limit?: number;
  offset?: number;
  more?: boolean;
  total?: number;
}

export interface TransformedOnCall {
  user?: {
    id: string;
    summary?: string;
  };
  escalation_policy?: {
    id: string;
    summary?: string;
  };
  schedule?: {
    id: string;
    summary?: string;
  };
  escalation_level?: number;
  start?: string;
  end?: string;
}

// =============================================================================
// Action input types (handler parameters)
// =============================================================================

export interface ListEscalationPoliciesInput {
  limit?: number;
  offset?: number;
  total?: boolean;
  query?: string;
  include?: string;
}

export interface GetEscalationPolicyInput {
  id: string;
  include?: string;
}

export interface ListIncidentsInput {
  limit?: number;
  offset?: number;
  total?: boolean;
  dateRange?: string;
  incidentKey?: string;
  include?: string;
  statuses?: string;
  serviceIds?: string;
  since?: string;
  until?: string;
  urgencies?: string;
  timeZone?: string;
  sortBy?: string;
}

export interface GetIncidentInput {
  id: string;
  include?: string;
}

export interface IncidentIdPaginationInput {
  incidentId: string;
  limit?: number;
  offset?: number;
  total?: boolean;
  include?: string;
}

export interface ListSchedulesInput {
  limit?: number;
  offset?: number;
  total?: boolean;
  query?: string;
  include?: string;
  timeZone?: string;
}

export interface GetScheduleInput {
  id: string;
  include?: string;
  timeZone?: string;
}

export interface ListOnCallsInput {
  limit?: number;
  offset?: number;
  total?: boolean;
  scheduleIds?: string;
  userIds?: string;
  escalationPolicyIds?: string;
  since?: string;
  until?: string;
  include?: string;
  timeZone?: string;
}

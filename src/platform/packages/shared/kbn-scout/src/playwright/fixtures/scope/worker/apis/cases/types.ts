/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface ApiStatusResponse {
  status: number;
}

export type CaseSeverity = 'low' | 'medium' | 'high' | 'critical';

export type CaseStatus = 'open' | 'closed' | 'in-progress';

export interface CaseConnector {
  id: string;
  name: string;
  type: string;
  fields: null | Record<string, any>;
}

export interface CaseSettings {
  syncAlerts: boolean;
  extractObservables: boolean;
}

export interface CaseUserProfile {
  uid: string;
  username?: string;
  fullName?: string | null;
  email?: string | null;
}

export interface CaseCreateRequest {
  description: string;
  tags: string[];
  title: string;
  connector: CaseConnector;
  settings: CaseSettings;
  owner: string;
  assignees?: CaseUserProfile[];
  severity?: CaseSeverity;
  category?: string | null;
  customFields?: Array<{
    key: string;
    type: string;
    value: any | null;
  }>;
}

export interface CaseUpdateRequest {
  id: string;
  version: string;
  description?: string;
  tags?: string[];
  title?: string;
  connector?: CaseConnector;
  severity?: CaseSeverity;
  assignees?: CaseUserProfile[];
  category?: string | null;
  customFields?: Array<{
    key: string;
    type: string;
    value: any | null;
  }>;
  settings?: CaseSettings;
  status?: CaseStatus;
  owner?: string;
}

export interface CasesFindRequest {
  [key: string]: any;
}

export interface CasesFindResponse {
  cases: Case[];
  page: number;
  per_page: number;
  total: number;
  count_open_cases: number;
  count_in_progress_cases: number;
  count_closed_cases: number;
}

export interface CasesFindRequest {
  // Filter parameters
  tags?: string | string[];
  status?: CaseStatus | CaseStatus[];
  severity?: CaseSeverity | CaseSeverity[];
  assignees?: string | string[];
  reporters?: string | string[];
  owner?: string | string[];
  category?: string | string[];

  // Search parameters
  defaultSearchOperator?: 'AND' | 'OR';
  search?: string;
  searchFields?: Array<'description' | 'title'> | 'description' | 'title';

  // Sort parameters
  sortField?: 'title' | 'category' | 'createdAt' | 'updatedAt' | 'closedAt' | 'status' | 'severity';
  sortOrder?: 'desc' | 'asc';

  // Date filters
  from?: string;
  to?: string;

  // Pagination parameters (defaults: page=1, perPage=20, max perPage=100)
  page?: number;
  perPage?: number;
}

export type AttachmentType =
  | 'user'
  | 'alert'
  | 'actions'
  | 'externalReference'
  | 'persistableState'
  | 'event';

export type AttachmentRequest =
  | UserCommentAttachmentRequest
  | AlertAttachmentRequest
  | ActionsAttachmentRequest
  | ExternalReferenceAttachmentRequest
  | PersistableStateAttachmentRequest
  | EventAttachmentRequest;

export interface UserCommentAttachmentRequest {
  comment: string;
  type: 'user';
  owner: string;
}

export interface AlertAttachmentRequest {
  type: 'alert';
  alertId: string | string[];
  index: string | string[];
  rule?: {
    id: string | null;
    name: string | null;
  };
  owner: string;
}

export interface ActionsAttachmentRequest {
  type: 'actions';
  comment: string;
  actions: {
    targets: Array<{
      hostname: string;
      endpointId: string;
    }>;
    type: string;
  };
  owner: string;
}

export interface ExternalReferenceAttachmentRequest {
  type: 'externalReference';
  externalReferenceId: string;
  externalReferenceStorage?: {
    type: 'savedObject' | 'elasticSearchDoc';
    soType?: string;
  };
  externalReferenceAttachmentTypeId?: string;
  externalReferenceMetadata?: Record<string, any> | null;
  owner: string;
}

export interface PersistableStateAttachmentRequest {
  type: 'persistableState';
  persistableStateAttachmentTypeId: string;
  persistableStateAttachmentState: Record<string, any>;
  owner: string;
}

export interface EventAttachmentRequest {
  type: 'event';
  event: {
    id: string;
    relatedItems: Array<{
      id: string;
      type: string;
      title?: string;
      index?: string;
    }>;
  };
  owner: string;
}

export interface Attachment {
  // Common properties for all attachment types
  id: string;
  version: string;

  // Common metadata fields
  created_at: string;
  created_by: {
    username: string;
    fullName: string | null;
    email: string | null;
  };
  owner: string;
  pushed_at: string | null;
  pushed_by: {
    username: string;
    fullName: string | null;
    email: string | null;
  } | null;
  updated_at: string | null;
  updated_by: {
    username: string;
    fullName: string | null;
    email: string | null;
  } | null;

  // Type-specific properties (one of these sets will be present)
  type: AttachmentType;

  // User comment attachment
  comment?: string;

  // Alert attachment
  alertId?: string | string[];
  index?: string | string[];
  rule?: {
    id: string | null;
    name: string | null;
  };

  // Actions attachment
  actions?: {
    targets: Array<{
      hostname: string;
      endpointId: string;
    }>;
    type: string;
  };

  // External reference attachment
  externalReferenceId?: string;
  externalReferenceStorage?: {
    type: 'savedObject' | 'elasticSearchDoc';
    soType?: string; // Present for savedObject type
  };
  externalReferenceAttachmentTypeId?: string;
  externalReferenceMetadata?: Record<string, any> | null;

  // Persistable state attachment
  persistableStateAttachmentTypeId?: string;
  persistableStateAttachmentState?: Record<string, any>;
}

export interface Case {
  id: string;
  version: string;
  title: string;
  description: string;
  tags: string[];
  status: CaseStatus;
  owner: string;
  connector: {
    id: string;
    name: string;
    type: string;
    fields: null | Record<string, any>;
  };
  severity: CaseSeverity;
  assignees: Array<{
    uid: string;
    username?: string;
    fullName?: string | null;
    email?: string | null;
  }>;
  category: string | null;
  customFields: Array<{
    key: string;
    type: string;
    value: any | null;
  }>;
  settings: {
    syncAlerts: boolean;
  };
  observables: any[];
  duration: number | null;
  closed_at: string | null;
  closed_by: {
    username: string;
    fullName: string | null;
    email: string | null;
  } | null;
  created_at: string;
  created_by: {
    username: string;
    fullName: string | null;
    email: string | null;
  };
  external_service: any | null;
  updated_at: string | null;
  updated_by: {
    username: string;
    fullName: string | null;
    email: string | null;
  } | null;

  incremental_id?: number | null;
  in_progress_at?: string | null;
  time_to_acknowledge?: number | null;
  time_to_investigate?: number | null;
  time_to_resolve?: number | null;

  totalComment: number;
  totalAlerts: number;
  comments?: Array<any>;
}

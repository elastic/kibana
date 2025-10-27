/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Security configuration objects for workflow management routes
 */

export const WORKFLOW_READ_SECURITY = {
  authz: {
    requiredPrivileges: [
      {
        anyRequired: ['read', 'workflow_read'],
      },
    ],
  },
};

export const WORKFLOW_CREATE_SECURITY = {
  authz: {
    requiredPrivileges: [
      {
        anyRequired: ['all', 'workflow_create'],
      },
    ],
  },
};

export const WORKFLOW_UPDATE_SECURITY = {
  authz: {
    requiredPrivileges: [
      {
        anyRequired: ['all', 'workflow_update'],
      },
    ],
  },
};

export const WORKFLOW_DELETE_SECURITY = {
  authz: {
    requiredPrivileges: [
      {
        anyRequired: ['all', 'workflow_delete'],
      },
    ],
  },
};

export const WORKFLOW_EXECUTE_SECURITY = {
  authz: {
    requiredPrivileges: [
      {
        anyRequired: ['all', 'workflow_execute', 'workflow_execution_create'],
      },
    ],
  },
};

export const WORKFLOW_EXECUTION_READ_SECURITY = {
  authz: {
    requiredPrivileges: [
      {
        anyRequired: ['read', 'workflow_execution_read'],
      },
    ],
  },
};

export const WORKFLOW_EXECUTION_CANCEL_SECURITY = {
  authz: {
    requiredPrivileges: [
      {
        anyRequired: ['read', 'workflow_execution_cancel'],
      },
    ],
  },
};

export const ADMIN_SECURITY = {
  authz: {
    requiredPrivileges: ['all'],
  },
};

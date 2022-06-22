/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsEventOutcome } from '@kbn/logging';
import { SavedObject } from '../../../types';

export interface CheckAuthorizationParams<A extends string> {
  types: Set<string>;
  spaces: Set<string>;
  actions: A[];
  options?: {
    allowGlobalResource?: boolean;
  };
}

export interface AuthorizationTypeEntry {
  authorizedSpaces: string[];
  isGloballyAuthorized?: boolean;
}

export type AuthorizationTypeMap<A extends string> = Map<string, Record<A, AuthorizationTypeEntry>>;

export interface CheckAuthorizationResult<A extends string> {
  status: 'fully_authorized' | 'partially_authorized' | 'unauthorized';
  typeMap: AuthorizationTypeMap<A>;
}

export interface EnforceAuthorizationParams<A extends string> {
  typesAndSpaces: Map<string, Set<string>>;
  action: A;
  typeMap: AuthorizationTypeMap<A>;
  auditCallback?: (error: Error | undefined) => void;
}

export enum AuditAction {
  CREATE = 'saved_object_create',
  GET = 'saved_object_get',
  RESOLVE = 'saved_object_resolve',
  UPDATE = 'saved_object_update',
  DELETE = 'saved_object_delete',
  FIND = 'saved_object_find',
  REMOVE_REFERENCES = 'saved_object_remove_references',
  OPEN_POINT_IN_TIME = 'saved_object_open_point_in_time',
  CLOSE_POINT_IN_TIME = 'saved_object_close_point_in_time',
  COLLECT_MULTINAMESPACE_REFERENCES = 'saved_object_collect_multinamespace_references', // this is separate from 'saved_object_get' because the user is only accessing an object's metadata
  UPDATE_OBJECTS_SPACES = 'saved_object_update_objects_spaces', // this is separate from 'saved_object_update' because the user is only updating an object's metadata
}

export interface AddAuditEventParams {
  action: AuditAction;
  outcome?: EcsEventOutcome;
  savedObject?: { type: string; id: string };
  addToSpaces?: readonly string[];
  deleteFromSpaces?: readonly string[];
  error?: Error;
}

export interface RedactNamespacesParams<T, A extends string> {
  savedObject: SavedObject<T>;
  typeMap: AuthorizationTypeMap<A>;
}

export interface ISavedObjectsSecurityExtension {
  checkAuthorization: <T extends string>(
    params: CheckAuthorizationParams<T>
  ) => Promise<CheckAuthorizationResult<T>>;
  enforceAuthorization: <T extends string>(params: EnforceAuthorizationParams<T>) => void;
  addAuditEvent: (params: AddAuditEventParams) => void;
  redactNamespaces: <T, A extends string>(params: RedactNamespacesParams<T, A>) => SavedObject<T>;
}

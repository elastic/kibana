/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectReferenceWithContext,
  SavedObjectsResolveResponse,
} from '@kbn/core-saved-objects-api-server';
import type { BulkResolveError } from '@kbn/core-saved-objects-common';
import { EcsEventOutcome } from '@kbn/ecs';
import { SavedObject } from '../..';

/**
 * The SecurityAction enumeration contains values for all
 * valid shared object security actions. The string for
 * each value correlates to the ES operation.
 */
export enum SecurityAction {
  CHECK_CONFLICTS,
  CLOSE_POINT_IN_TIME,
  COLLECT_MULTINAMESPACE_REFERENCES,
  COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES,
  CREATE,
  BULK_CREATE,
  DELETE,
  BULK_DELETE,
  FIND,
  GET,
  BULK_GET,
  INTERNAL_BULK_RESOLVE,
  OPEN_POINT_IN_TIME,
  REMOVE_REFERENCES,
  UPDATE,
  BULK_UPDATE,
  UPDATE_OBJECTS_SPACES,
}

/**
 * The InternalAuthorizeOptions interface contains basic options
 * for internal authorize methods of the ISavedObjectsSecurityExtension.
 */
export interface InternalAuthorizeOptions {
  /**
   * Whether or not to force the use of the bulk action for the authorization.
   * By default this will be based on the number of objects passed to the
   * authorize method.
   */
  forceBulkAction: boolean;
}

/**
 * The MultiNamespaceReferencesOptions interface contains options
 * specific for authorizing CollectMultiNamespaceReferences actions.
 */
export interface MultiNamespaceReferencesOptions {
  /**
   * The purpose of the call to 'collectMultiNamespaceReferences'.
   * Default is 'collectMultiNamespaceReferences'.
   */
  purpose?: 'collectMultiNamespaceReferences' | 'updateObjectsSpaces';
}

/**
 * The AuditHelperParams interface contains parameters to log audit events
 * within the ISavedObjectsSecurityExtension.
 */
export interface AuditHelperParams {
  /**
   * The audit action to log.
   */
  action: AuditAction;
  /**
   * The objects applicable to the action.
   */
  objects?: Array<{ type: string; id: string }>;
  /**
   * Whether or not to use success as the non-failure outcome. Default is 'unknown'.
   */
  useSuccessOutcome?: boolean;

  addToSpaces?: string[];
  deleteFromSpaces?: string[];
  /**
   * Error information produced by the action.
   */
  error?: Error;
}

/**
 * The UpdateSpacesAuditHelperParams interface contains parameters to log
 * audit events for the UPDATE_OBJECTS_SPACES audit action within the
 * ISavedObjectsSecurityExtension.
 */
export interface UpdateSpacesAuditHelperParams extends AuditHelperParams {
  /**
   * The audit action to log is always UPDATE_OBJECTS_SPACES.
   */
  action: AuditAction.UPDATE_OBJECTS_SPACES;
  /**
   * Spaces to which the the object(s) are being added.
   */
  addToSpaces?: string[];
  /**
   * Spaces from which the the object(s) are being removed.
   */
  deleteFromSpaces?: string[];
}

/**
 * FUTURE: The TypesAndSpacesAuditHelperParams interface contains parameters to log
 * audit events for the FIND and OPEN_POINT_IN_TIME audit actions within the
 * ISavedObjectsSecurityExtension.
 */
// export interface TypesAndSpacesAuditHelperParams extends AuditHelperParams {
//   /**
//    * The audit action to log is either FIND or OPEN_POINT_IN_TIME.
//    */
//   action: AuditAction.FIND | AuditAction.OPEN_POINT_IN_TIME;
//   /**
//    * The spaces requested for the action.
//    */
//   spaces?: Set<string>;
//   /**
//    * The types requested for the action.
//    */
//   types?: Set<string>;
// }

/**
 * The AuditOptions interface contains optional settings for audit
 * logging within the ISavedObjectsSecurityExtension.
 */
export interface AuditOptions {
  /**
   * An array of applicable objects for the authorization action
   * If undefined or empty, general auditing will occur (one log/action)
   */
  objects?: Array<{ type: string; id: string }>;
  /**
   * Whether or not to bypass audit logging on authz success. Default false.
   */
  bypassOnSuccess?: boolean;
  /**
   * Whether or not to bypass audit logging on authz failure. Default false.
   */
  bypassOnFailure?: boolean;
  /**
   * If authz success should be logged as 'success'. Default false.
   */
  useSuccessOutcome?: boolean;
}

export interface UpdateSpacesAuditOptions extends AuditOptions {
  /**
   * An array of spaces which to add the objects (used in Update Object Spaces)
   */
  addToSpaces?: string[];
  /**
   * An array of spaces from which to remove the objects (used in Update Object Spaces)
   */
  deleteFromSpaces?: string[];
}

/**
 * The AuthorizeParams interface contains settings for checking
 * & enforcing authorization via the ISavedObjectsSecurityExtension.
 */
// ToDo: change to InternalAuthorizeParams
export interface AuthorizeParams<A extends string> {
  /**
   * A set of actions to check.
   */
  actions: Set<SecurityAction>;
  /**
   * A set of types to check.
   */
  types: Set<string>;
  /**
   * A set of spaces to check (types to check comes from the typesAndSpaces map).
   */
  spaces: Set<string>;
  /**
   * A map of types (key) to spaces (value) that will be affected by the action(s).
   * If undefined, enforce with be bypassed.
   */
  enforceMap?: Map<string, Set<string>>;
  /**
   * Options
   * allowGlobalResource - whether or not to allow global resources, false if options are undefined
   */
  options?: {
    allowGlobalResource?: boolean;
  };
  /**
   * auditOptions - options for audit logging
   */
  auditOptions?: AuditOptions | UpdateSpacesAuditOptions;
}

/**
 * The CheckAuthorizationParams interface contains settings for checking
 * authorization via the ISavedObjectsSecurityExtension.
 */
export interface CheckAuthorizationParams<A extends string> {
  /**
   * A set of types to check.
   */
  types: Set<string>;
  /**
   * A set of spaces to check.
   */
  spaces: Set<string>;
  /**
   * An set of actions to check.
   */
  actions: Set<A>;
  /**
   * Authorization options - whether or not to allow global resources, false if options are undefined
   */
  options?: {
    allowGlobalResource: boolean;
  };
}

/**
 * The AuthorizationTypeEntry interface contains space-related details
 * for CheckAuthorizationResults.
 */
export interface AuthorizationTypeEntry {
  /**
   * An array of authorized spaces for the associated type/action
   * in the associated record/map.
   */
  authorizedSpaces: string[];
  /**
   * Is the associated type/action globally authorized?
   */
  isGloballyAuthorized?: boolean;
}

/**
 * The AuthorizationTypeMap type is a map of saved object type
 * to a record of action/AuthorizationTypeEntry,
 */
export type AuthorizationTypeMap<A extends string> = Map<string, Record<A, AuthorizationTypeEntry>>;

/**
 * The CheckAuthorizationResult interface contains the overall status of an
 * authorization check and the specific authorized privileges as an
 * AuthorizationTypeMap.
 */
export interface CheckAuthorizationResult<A extends string> {
  /**
   * The overall status of the authorization check as a string:
   * 'fully_authorized' | 'partially_authorized' | 'unauthorized'
   */
  status: 'fully_authorized' | 'partially_authorized' | 'unauthorized';
  /**
   * The specific authorized privileges: a map of type to record
   * of action/AuthorizationTypeEntry (spaces/globallyAuthz'd)
   */
  typeMap: AuthorizationTypeMap<A>;
}

/**
 * The EnforceAuthorizationParams interface contains settings for
 * enforcing a single action via the ISavedObjectsSecurityExtension.
 */
export interface EnforceAuthorizationParams<A extends string> {
  /**
   * A map of types to spaces that will be affected by the action
   */
  typesAndSpaces: Map<string, Set<string>>;
  /**
   * The relevant security action (create, update, etc.)
   */
  action: SecurityAction;
  /**
   * The authorization map from CheckAuthorizationResult: a
   * map of type to record of action/AuthorizationTypeEntry
   * (spaces/globallyAuthz'd)
   */
  typeMap: AuthorizationTypeMap<A>;
  /**
   * auditOptions - options for audit logging
   */
  auditOptions?: AuditOptions | UpdateSpacesAuditOptions;
}

/**
 * The AuditAction enumeration contains values for all
 * valid audit actions for use in AddAuditEventParams.
 */
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

/**
 * The AddAuditEventParams interface contains settings for adding
 * audit events via the ISavedObjectsSecurityExtension.
 */
export interface AddAuditEventParams {
  /**
   * The relevant action
   */
  action: AuditAction;
  /**
   * The outcome of the operation
   * 'failure' | 'success' | 'unknown'
   */
  outcome?: EcsEventOutcome;
  /**
   * relevant saved object information
   * object containing type & id strings
   */
  savedObject?: { type: string; id: string };
  /**
   * Array of spaces being added. For
   * UPDATE_OBJECTS_SPACES action only
   */
  addToSpaces?: readonly string[];
  /**
   * Array of spaces being removed. For
   * UPDATE_OBJECTS_SPACES action only
   */
  deleteFromSpaces?: readonly string[];
  /**
   * relevant error information to add to
   * the audit event
   */
  error?: Error;
}

/**
 * The RedactNamespacesParams interface contains settings for filtering
 * namespace access via the ISavedObjectsSecurityExtension.
 */
export interface RedactNamespacesParams<T, A extends string> {
  /**
   * relevant saved object
   */
  savedObject: SavedObject<T>;
  /**
   * The authorization map from CheckAuthorizationResult: a map of
   * type to record of action/AuthorizationTypeEntry
   * (spaces/globallyAuthz'd)
   */
  typeMap: AuthorizationTypeMap<A>;
}

export interface AuthorizeObject {
  type: string;
  id: string;
  existingNamespaces?: string[];
}
export interface AuthorizeCreateObject extends AuthorizeObject {
  initialNamespaces?: string[];
}

export interface AuthorizeUpdateObject extends AuthorizeObject {
  objectNamespace?: string;
}

export interface AuthorizeBulkGetObject extends AuthorizeObject {
  requestedNamespaces?: string[];
  error?: boolean;
}

export interface AuthorizeBulkCreateParams {
  namespace: string | undefined;
  objects: AuthorizeCreateObject[];
}

export interface AuthorizeCreateParams {
  namespace: string | undefined;
  object: AuthorizeCreateObject;
}

export interface AuthorizeUpdateParams {
  namespace: string | undefined;
  object: AuthorizeUpdateObject;
}

export interface AuthorizeBulkUpdateParams {
  namespace: string | undefined;
  objects: AuthorizeUpdateObject[];
}

export interface AuthorizeDeleteParams {
  namespace: string | undefined;
  object: AuthorizeObject;
}

export interface AuthorizeBulkDeleteParams {
  namespace: string | undefined;
  objects: AuthorizeObject[];
}

export interface AuthorizeGetParams {
  namespace: string | undefined;
  object: AuthorizeObject;
  objectNotFound?: boolean;
}

export interface AuthorizeBulkGetParams {
  namespace: string | undefined;
  objects: AuthorizeBulkGetObject[];
}

export interface AuthorizeCheckConflictsParams {
  namespace: string | undefined;
  objects: AuthorizeObject[];
}

export interface AuthorizeOpenPointInTimeParams {
  namespaces: Set<string>;
  types: Set<string>;
}

export interface AuthorizeAndRedactMultiNamespaceReferencesParams {
  namespace: string | undefined;
  objects: SavedObjectReferenceWithContext[];
  options?: MultiNamespaceReferencesOptions;
}

export interface AuthorizeAndRedactInternalBulkResolveParams<T> {
  namespace: string | undefined;
  objects: Array<SavedObjectsResolveResponse<T> | BulkResolveError>;
}

export interface AuthorizeUpdateSpacesParams {
  namespace: string | undefined;
  spacesToAdd: string[];
  spacesToRemove: string[];
  objects: AuthorizeObject[];
}

/**
 * The ISavedObjectsSecurityExtension interface defines the functions of a saved objects repository security extension.
 * It contains functions for checking & enforcing authorization, adding audit events, and redacting namespaces.
 */
export interface ISavedObjectsSecurityExtension {
  /**
   * Performs authorization for create actions
   * @param params - actions, types & spaces map, audit callback, options (enforce bypassed if enforce map is undefined)
   * @returns CheckAuthorizationResult or undefined - the resulting authorization level and authorization map, undefined
   * if the authorization action does not require an authorization check. (ToDo: remove this possibility for actions that are not applicable?)
   */
  authorizeCreate: (
    params: AuthorizeCreateParams
  ) => Promise<CheckAuthorizationResult<string> | undefined>;

  authorizeBulkCreate: (
    params: AuthorizeBulkCreateParams
  ) => Promise<CheckAuthorizationResult<string> | undefined>;

  authorizeUpdate: (
    params: AuthorizeUpdateParams
  ) => Promise<CheckAuthorizationResult<string> | undefined>;

  authorizeBulkUpdate: (
    params: AuthorizeBulkUpdateParams
  ) => Promise<CheckAuthorizationResult<string> | undefined>;

  authorizeDelete: (
    params: AuthorizeDeleteParams
  ) => Promise<CheckAuthorizationResult<string> | undefined>;

  authorizeBulkDelete: (
    params: AuthorizeBulkDeleteParams
  ) => Promise<CheckAuthorizationResult<string> | undefined>;

  authorizeGet: (
    params: AuthorizeGetParams
  ) => Promise<CheckAuthorizationResult<string> | undefined>;

  authorizeBulkGet: (
    params: AuthorizeBulkGetParams
  ) => Promise<CheckAuthorizationResult<string> | undefined>;

  authorizeCheckConflicts: (
    params: AuthorizeCheckConflictsParams
  ) => Promise<CheckAuthorizationResult<string> | undefined>;

  authorizeRemoveReferences: (
    params: AuthorizeDeleteParams
  ) => Promise<CheckAuthorizationResult<string> | undefined>;

  /**
   * Checks/enforces authorization, writes audit events, filters the object graph, and redacts spaces from the share_to_space/bulk_get
   * response. In other SavedObjectsRepository functions we do this before decrypting attributes. However, because of the
   * share_to_space/bulk_get response logic involved in deciding between the exact match or alias match, it's cleaner to do authorization,
   * auditing, filtering, and redaction all afterwards.
   * @param params - ToDo:
   * @returns
   */
  authorizeAndRedactMultiNamespaceReferences: (
    params: AuthorizeAndRedactMultiNamespaceReferencesParams
  ) => Promise<SavedObjectReferenceWithContext[]>;

  /**
   * Checks authorization, writes audit events, and redacts namespaces from the bulkResolve response. In other SavedObjectsRepository
   * functions we do this before decrypting attributes. However, because of the bulkResolve logic involved in deciding between the exact match
   * or alias match, it's cleaner to do authorization, auditing, and redaction all afterwards.
   * @param params - ToDo:
   * @returns
   */
  authorizeAndRedactInternalBulkResolve: <T = unknown>(
    params: AuthorizeAndRedactInternalBulkResolveParams<T>
  ) => Promise<Array<SavedObjectsResolveResponse<T> | BulkResolveError>>;

  /**
   * Performs authorization for the updateObjectsSpaces repository method
   * @param params namespace, spacesToAdd, spacesToRemove, objects to authorize
   * @returns CheckAuthorizationResult or undefined - the resulting authorization level and authorization map, undefined
   * if the authorization action does not require an authorization check. (ToDo: remove this possibility for actions that are not applicable?)
   */
  authorizeUpdateSpaces: (
    params: AuthorizeUpdateSpacesParams
  ) => Promise<CheckAuthorizationResult<string> | undefined>;

  /**
   * Performs authorization (check & enforce) of actions on specified types in specified spaces.
   * @param params - actions, types & spaces map, audit callback, options (enforce bypassed if enforce map is undefined)
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorize: <T extends string>(
    params: AuthorizeParams<T>
  ) => Promise<CheckAuthorizationResult<T> | undefined>;

  /**
   * Adds an audit event for the specified action with relevant information
   * @param params - the action, outcome, error, and relevant object/space information
   */
  addAuditEvent: (params: AddAuditEventParams) => void;

  /**
   * Filters a saved object's spaces based on an authorization map (from CheckAuthorizationResult)
   * @param params - the saved object and an authorization map
   * @returns SavedObject - saved object with filtered spaces
   */
  redactNamespaces: <T, A extends string>(params: RedactNamespacesParams<T, A>) => SavedObject<T>;
}

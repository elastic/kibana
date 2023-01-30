/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectReferenceWithContext,
  SavedObjectsFindResult,
  SavedObjectsResolveResponse,
} from '@kbn/core-saved-objects-api-server';
import type { BulkResolveError, LegacyUrlAliasTarget } from '@kbn/core-saved-objects-common';
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
  /**
   * The spaces in which to add the objects. Default is none.
   */
  addToSpaces?: string[];
  /**
   * The spaces from which to remove the objects. Default is none.
   */
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

/**
 * The UpdateSpacesAuditOptions interface contains optional settings for
 * auditing the UPDATE_OBJECTS_SPACES action.
 */
export interface UpdateSpacesAuditOptions extends AuditOptions {
  /**
   * An array of spaces which to add the objects (used in updateObjectsSpaces)
   */
  addToSpaces?: string[];
  /**
   * An array of spaces from which to remove the objects (used in updateObjectsSpaces)
   */
  deleteFromSpaces?: string[];
}

/**
 * The InternalAuthorizeParams interface contains settings for checking
 * & enforcing authorization via the ISavedObjectsSecurityExtension. This
 * is used only for the private authorize method.
 */
export interface InternalAuthorizeParams<A extends string> {
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
   * Options for authorization
   */
  options?: {
    /**
     * allowGlobalResource - whether or not to allow global resources, false if options are undefined
     */
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
   * Authorization options
   */
  options?: {
    /**
     * allowGlobalResource - whether or not to allow global resources, false if options are undefined
     */
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
 * This is used only for the private enforceAuthorization method.
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
  /**
   * For create & bulk create operations
   */
  CREATE = 'saved_object_create',
  /**
   * For get & bulk get operations
   */
  GET = 'saved_object_get',
  /**
   * For resolve and bulk resolve operations
   */
  RESOLVE = 'saved_object_resolve',
  /**
   * For update and bulk update operations
   */
  UPDATE = 'saved_object_update',
  /**
   * For delete and bulk delete operations
   */
  DELETE = 'saved_object_delete',
  /**
   * For the find operation
   */
  FIND = 'saved_object_find',
  /**
   * For the remove references to operation
   */
  REMOVE_REFERENCES = 'saved_object_remove_references',
  /**
   * For the open point in time for type to operation
   */
  OPEN_POINT_IN_TIME = 'saved_object_open_point_in_time',
  /**
   * For the close point in time operation
   */
  CLOSE_POINT_IN_TIME = 'saved_object_close_point_in_time',
  /**
   * For the Collect References operation and for collect references for the update objects spaces operation
   */
  COLLECT_MULTINAMESPACE_REFERENCES = 'saved_object_collect_multinamespace_references', // this is separate from 'saved_object_get' because the user is only accessing an object's metadata
  /**
   * For the update objects spaces operation
   */
  UPDATE_OBJECTS_SPACES = 'saved_object_update_objects_spaces', // this is separate from 'saved_object_update' because the user is only updating an object's metadata
}

/**
 * The AddAuditEventParams interface contains settings for adding
 * audit events via the ISavedObjectsSecurityExtension. This is
 * used only for the private addAuditEvent method.
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
   * Relevant saved object information
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
   * Relevant error information to add to
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
   * Relevant saved object
   */
  savedObject: SavedObject<T>;
  /**
   * The authorization map from CheckAuthorizationResult: a map of
   * type to record of action/AuthorizationTypeEntry
   * (spaces/globallyAuthz'd)
   */
  typeMap: AuthorizationTypeMap<A>;
}

/**
 * The AuthorizeObject interface contains information to specify an
 * object for authorization. This is a base interface which is
 * extended by other interfaces for specific actions.
 */
export interface AuthorizeObject {
  /**
   * The type of object
   */
  type: string;
  /**
   * The id of the object
   */
  id: string;
}

/**
 * The AuthorizeObjectWithExistingSpaces extends AuthorizeObject and contains
 * an array of existing namespaces for the object. Used by the
 * authorizeDelete, authorizeBulkDelete, authorizeGet,
 * authorizeCheckConflicts, and getFindRedactTypeMap methods.
 */
export interface AuthorizeObjectWithExistingSpaces extends AuthorizeObject {
  /**
   * Spaces where the object is known to exist. Usually populated
   * by document data from the result of an es query.
   */
  existingNamespaces?: string[];
}

/**
 * The AuthorizeCreateObject interface extends AuthorizeObjectWithExistingSpaces
 * and contains an array of initial namespaces for the object. Used by
 * the authorizeCreate and authorizeBulkCreate methods.
 */
export interface AuthorizeCreateObject extends AuthorizeObjectWithExistingSpaces {
  /**
   * Initial spaces to include the created object. Populated by options
   * passed to the repository's bulkCreate method.
   */
  initialNamespaces?: string[];
}

/**
 * The AuthorizeUpdateObject interface extends AuthorizeObjectWithExistingSpaces
 * and contains a object namespace override. Used by the authorizeUpdate
 * and authorizeBulkUpdate methods.
 */
export interface AuthorizeUpdateObject extends AuthorizeObjectWithExistingSpaces {
  /**
   * The namespace in which to update this object. Populated by options
   * passed to the repository's update or bulkUpdate method.
   */
  objectNamespace?: string;
}

/**
 * The AuthorizeBulkGetObject interface extends AuthorizeObjectWithExistingSpaces
 * and contains a object namespaces override. Used by the
 * authorizeBulkGet method.
 */
export interface AuthorizeBulkGetObject extends AuthorizeObjectWithExistingSpaces {
  /**
   * The namespaces to include when retrieving this object. Populated by options
   * passed to the repository's update or bulkUpdate method.
   */
  objectNamespaces?: string[];
  /**
   * Whether or not an error occured when getting this object. Populated by
   * the result of a query. Default is false.
   */
  error?: boolean;
}

/**
 * The AuthorizeParams interface is a base interface for parameters to several
 * public authorize methods within the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeParams {
  /**
   * The namespace in which to perform the authorization operation.
   * If undefined, the current space will be used unless spaces are disabled,
   * in which case the default space will be used.
   */
  namespace: string | undefined;
}

/**
 * The AuthorizeCreateParams interface extends AuthorizeParams and is
 * used for the AuthorizeCreate method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeCreateParams extends AuthorizeParams {
  /**
   * The object to authorize
   */
  object: AuthorizeCreateObject;
}

/**
 * The AuthorizeBulkCreateParams interface extends AuthorizeParams and is
 * used for the AuthorizeBulkCreate method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeBulkCreateParams extends AuthorizeParams {
  /**
   * The objects to authorize
   */
  objects: AuthorizeCreateObject[];
}

/**
 * The AuthorizeUpdateParams interface extends AuthorizeParams and is
 * used for the AuthorizeUpdate method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeUpdateParams extends AuthorizeParams {
  /**
   * The object to authorize
   */
  object: AuthorizeUpdateObject;
}

/**
 * The AuthorizeBulkUpdateParams interface extends AuthorizeParams and is
 * used for the AuthorizeBulkUpdate method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeBulkUpdateParams extends AuthorizeParams {
  /**
   * The objects to authorize
   */
  objects: AuthorizeUpdateObject[];
}

/**
 * The AuthorizeDeleteParams interface extends AuthorizeParams and is
 * used for the AuthorizeDelete method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeDeleteParams extends AuthorizeParams {
  /**
   * The object to authorize
   */
  object: AuthorizeObjectWithExistingSpaces;
}

/**
 * The AuthorizeBulkDeleteParams interface extends AuthorizeParams and is
 * used for the AuthorizeBulkDelete method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeBulkDeleteParams extends AuthorizeParams {
  /**
   * The objects to authorize
   */
  objects: AuthorizeObjectWithExistingSpaces[];
}

/**
 * The AuthorizeGetParams interface extends AuthorizeParams and is
 * used for the AuthorizeGet method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeGetParams extends AuthorizeParams {
  /**
   * The object to authorize
   */
  object: AuthorizeObjectWithExistingSpaces;
  /**
   * whether or not the object was not found. defaults to false.
   */
  objectNotFound?: boolean;
}

/**
 * The AuthorizeBulkGetParams interface extends AuthorizeParams and is
 * used for the AuthorizeBulkGet method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeBulkGetParams extends AuthorizeParams {
  /**
   * The objects to authorize
   */
  objects: AuthorizeBulkGetObject[];
}

/**
 * The AuthorizeCheckConflictsParams interface extends AuthorizeParams and is
 * used for the AuthorizeCheckConflicts method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeCheckConflictsParams extends AuthorizeParams {
  /**
   * The objects to authorize
   */
  objects: AuthorizeObjectWithExistingSpaces[];
}

/**
 * The AuthorizeFindParams interface is used for the AuthorizeFind method
 * of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeFindParams {
  /**
   * The namespaces in which to find objects
   */
  namespaces: Set<string>;
  /**
   * The types of objects to find
   */
  types: Set<string>;
}

/**
 * The AuthorizeOpenPointInTimeParams interface is used for the
 * AuthorizeOpenPointInTime method of the ISavedObjectsSecurityExtension.
 * It is identical to AuthorizeFindParams.
 */
export type AuthorizeOpenPointInTimeParams = AuthorizeFindParams;

/**
 * The GetFindRedactTypeMapParams interface is used for the GetFindRedactTypeMap
 * method of the ISavedObjectsSecurityExtension.
 */
export interface GetFindRedactTypeMapParams {
  /**
   * The namespaces previously checked by the AuthorizeFind method
   */
  previouslyCheckedNamespaces: Set<string>;
  /**
   * The objects to authorize in order to generate the type map
   * this should be populated by the result of the es query
   */
  objects: AuthorizeObjectWithExistingSpaces[];
}

/**
 * The AuthorizeAndRedactMultiNamespaceReferencesParams interface extends
 * AuthorizeParams and is used for the AuthorizeAndRedactMultiNamespaceReferences
 * method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeAndRedactMultiNamespaceReferencesParams extends AuthorizeParams {
  /**
   * The objects to authorize
   */
  objects: SavedObjectReferenceWithContext[];
  /**
   * options for the operation
   * - purpose: 'collectMultiNamespaceReferences' or 'updateObjectsSpaces'
   * default purpose is 'collectMultiNamespaceReferences'.
   */
  options?: MultiNamespaceReferencesOptions;
}

/**
 * The AuthorizeAndRedactInternalBulkResolveParams interface extends
 * AuthorizeParams and is used for the AuthorizeAndRedactInternalBulkResolve
 * method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeAndRedactInternalBulkResolveParams<T> extends AuthorizeParams {
  /**
   * The objects to authorize
   */
  objects: Array<SavedObjectsResolveResponse<T> | BulkResolveError>;
}

/**
 * The AuthorizeUpdateSpacesParams interface extends AuthorizeParams and is
 * used for the AuthorizeUpdateSpaces method of the ISavedObjectsSecurityExtension.
 */
export interface AuthorizeUpdateSpacesParams extends AuthorizeParams {
  /**
   * The spaces in which to add the objects
   */
  spacesToAdd: string[];
  /**
   * The spaces from which to remove the objects
   */
  spacesToRemove: string[];
  /**
   * The objects to authorize
   */
  objects: AuthorizeObjectWithExistingSpaces[];
}

/**
 * The ISavedObjectsSecurityExtension interface defines the functions of a saved objects repository security extension.
 * It contains functions for checking & enforcing authorization, adding audit events, and redacting namespaces.
 */
export interface ISavedObjectsSecurityExtension {
  /**
   * Performs authorization for the CREATE security action
   * @param params the namespace and object to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeCreate: <A extends string>(
    params: AuthorizeCreateParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs authorization for the BULK_CREATE security action
   * @param params the namespace and objects to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeBulkCreate: <A extends string>(
    params: AuthorizeBulkCreateParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs authorization for the UPDATE security action
   * @param params the namespace and object to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeUpdate: <A extends string>(
    params: AuthorizeUpdateParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs authorization for the BULK_UPDATE security action
   * @param params the namespace and objects to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeBulkUpdate: <A extends string>(
    params: AuthorizeBulkUpdateParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs authorization for the DELETE security action
   * @param params the namespace and object to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeDelete: <A extends string>(
    params: AuthorizeDeleteParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs authorization for the BULK_DELETE security action
   * @param params the namespace and objects to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeBulkDelete: <A extends string>(
    params: AuthorizeBulkDeleteParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs authorization for the GET security action
   * @param params the namespace, object to authorize, and whether or not the object was found
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeGet: <A extends string>(
    params: AuthorizeGetParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs authorization for the BULK_GET security action
   * @param params the namespace and objects to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeBulkGet: <A extends string>(
    params: AuthorizeBulkGetParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs authorization for the CHECK_CONFLICTS security action
   * @param params the namespace and objects to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeCheckConflicts: <A extends string>(
    params: AuthorizeCheckConflictsParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs authorization for the REMOVE_REFERENCES security action
   * @param params the namespace and object to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeRemoveReferences: <A extends string>(
    params: AuthorizeDeleteParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs authorization for the OPEN_POINT_IN_TIME security action
   * @param params the namespaces and types to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeOpenPointInTime: <A extends string>(
    params: AuthorizeOpenPointInTimeParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs audit logging for the CLOSE_POINT_IN_TIME security action
   */
  auditClosePointInTime: () => void;

  /**
   * Handles all security operations for the COLLECT_MULTINAMESPACE_REFERENCES security action
   * Checks/enforces authorization, writes audit events, filters the object graph, and redacts spaces from the share_to_space/bulk_get
   * response. In other SavedObjectsRepository functions we do this before decrypting attributes. However, because of the
   * share_to_space/bulk_get response logic involved in deciding between the exact match or alias match, it's cleaner to do authorization,
   * auditing, filtering, and redaction all afterwards.
   * @param params - the namespace, objects to authorize, and purpose of the operation
   * @returns SavedObjectReferenceWithContext[] - array of collected references
   */
  authorizeAndRedactMultiNamespaceReferences: (
    params: AuthorizeAndRedactMultiNamespaceReferencesParams
  ) => Promise<SavedObjectReferenceWithContext[]>;

  /**
   * Handles all security operations for the INTERNAL_BULK_RESOLVE security action
   * Checks authorization, writes audit events, and redacts namespaces from the bulkResolve response. In other SavedObjectsRepository
   * functions we do this before decrypting attributes. However, because of the bulkResolve logic involved in deciding between the exact match
   * or alias match, it's cleaner to do authorization, auditing, and redaction all afterwards.
   * @param params - the namespace and objects to authorize
   * @returns Array of SavedObjectsResolveResponses or BulkResolveErrors - the redacted resolve responses or errors
   */
  authorizeAndRedactInternalBulkResolve: <T = unknown>(
    params: AuthorizeAndRedactInternalBulkResolveParams<T>
  ) => Promise<Array<SavedObjectsResolveResponse<T> | BulkResolveError>>;

  /**
   * Performs authorization for the UPDATE_OBJECTS_SPACES security action
   * @param params - namespace, spacesToAdd, spacesToRemove, and objects to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeUpdateSpaces: <A extends string>(
    params: AuthorizeUpdateSpacesParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Performs authorization for the FIND security action
   * This method is the first of two security steps for the find operation (saved objects repository's find method)
   * This method should be called first in order to provide data needed to construct the type-to-namespace map for the search DSL
   * @param params - namespaces and types to authorize
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  authorizeFind: <A extends string>(
    params: AuthorizeFindParams
  ) => Promise<CheckAuthorizationResult<A>>;

  /**
   * Gets an updated type map for redacting results of the FIND security action
   * This method is the second of two security steps for the find operation (saved objects repository's find method)
   * This method should be called last in order to update the type map used to redact namespaces in the results
   * @param params - namespace, spacesToAdd, spacesToRemove, and objects to authorize
   * @returns - the updated type map used for redaction
   */
  getFindRedactTypeMap: <A extends string>(
    params: GetFindRedactTypeMapParams
  ) => Promise<AuthorizationTypeMap<A> | undefined>;

  /**
   * Filters a saved object's spaces based on an authorization map (from CheckAuthorizationResult)
   * @param params - the saved object and an authorization map
   * @returns SavedObject - saved object with filtered spaces
   */
  redactNamespaces: <T, A extends string>(params: RedactNamespacesParams<T, A>) => SavedObject<T>;

  /**
   * Performs authorization for the disableLegacyUrlAliases method of the SecureSpacesClientWrapper
   * There is no return for this method. If unauthorized the method with throw, otherwise will resolve.
   * @param aliases - array of legacuy url alias targets
   */
  authorizeDisableLegacyUrlAliases: (aliases: LegacyUrlAliasTarget[]) => void;

  /**
   * Performs saved object audit logging for the delete method of the SecureSpacesClientWrapper
   * @param spaceId - the id of the space being deleted
   * @param objects - the objects to audit
   */
  auditObjectsForSpaceDeletion: <T = unknown>(
    spaceId: string,
    objects: Array<SavedObjectsFindResult<T>>
  ) => void;
}

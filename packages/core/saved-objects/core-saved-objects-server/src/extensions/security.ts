/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EcsEventOutcome } from '@kbn/ecs';
import type { SavedObject } from '../..';

/**
 * The PerformAuthorizationParams interface contains settings for checking
 * & enforcing authorization via the ISavedObjectsSecurityExtension.
 */
export interface PerformAuthorizationParams<A extends string> {
  /**
   * A set of actions to check.
   */
  actions: Set<A>;
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
   * A callback intended to handle adding audit events in
   * both error (unauthorized), or success (authorized)
   * cases
   */
  auditCallback?: (error?: Error) => void;
  /**
   * Authorization options
   * allowGlobalResource - whether or not to allow global resources, false if options are undefined
   */
  options?: {
    allowGlobalResource: boolean;
  };
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
   * The relevant action (create, update, etc.)
   */
  action: A;
  /**
   * The authorization map from CheckAuthorizationResult: a
   * map of type to record of action/AuthorizationTypeEntry
   * (spaces/globallyAuthz'd)
   */
  typeMap: AuthorizationTypeMap<A>;
  /**
   * A callback intended to handle adding audit events in
   * both error (unauthorized), or success (authorized)
   * cases
   */
  auditCallback?: (error?: Error) => void;
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

/**
 * The ISavedObjectsSecurityExtension interface defines the functions of a saved objects repository security extension.
 * It contains functions for checking & enforcing authorization, adding audit events, and redacting namespaces.
 */
export interface ISavedObjectsSecurityExtension {
  /**
   * Performs authorization (check & enforce) of actions on specified types in specified spaces.
   * @param params - actions, types & spaces map, audit callback, options (enforce bypassed if enforce map is undefined)
   * @returns CheckAuthorizationResult - the resulting authorization level and authorization map
   */
  performAuthorization: <T extends string>(
    params: PerformAuthorizationParams<T>
  ) => Promise<CheckAuthorizationResult<T>>;

  /**
   * Enforces authorization of a single action on specified types in specified spaces.
   * Throws error if authorization map does not cover specified parameters.
   * @param params - map of types/spaces, action to check, and authz map (from CheckAuthorizationResult)
   */
  enforceAuthorization: <T extends string>(params: EnforceAuthorizationParams<T>) => void;

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

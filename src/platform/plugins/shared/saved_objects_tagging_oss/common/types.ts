/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface Tag {
  id: string;
  managed: boolean;
  name: string;
  description: string;
  color: string;
}

export interface TagAttributes {
  name: string;
  description: string;
  color: string;
}

export type TagWithOptionalId = Omit<Tag, 'id'> & { id?: string };

export interface GetAllTagsOptions {
  asSystemRequest?: boolean;
}

export interface CreateTagOptions {
  id?: string;
  overwrite?: boolean;
  refresh?: boolean | 'wait_for';
  managed?: boolean;
}

export interface ITagsClient {
  create(attributes: TagAttributes, options?: CreateTagOptions): Promise<Tag>;
  get(id: string): Promise<Tag>;
  getAll(options?: GetAllTagsOptions): Promise<Tag[]>;
  findByName(name: string, options?: { exact?: boolean }): Promise<Tag | null>;
  delete(id: string): Promise<void>;
  update(id: string, attributes: TagAttributes): Promise<Tag>;
}

export interface FindAssignableObjectsOptions {
  search?: string;
  maxResults?: number;
  types?: string[];
}

export interface UpdateTagAssignmentsOptions {
  tags: string[];
  assign: ObjectReference[];
  unassign: ObjectReference[];
  refresh?: boolean | 'wait_for';
}

/**
 * `type`+`id` tuple of a saved object
 */
export interface ObjectReference {
  type: string;
  id: string;
}

/**
 * Represent an assignable saved object, as returned by the `_find_assignable_objects` API
 */
export interface AssignableObject extends ObjectReference {
  icon?: string;
  title: string;
  tags: string[];
}

/**
 * Return a string that can be used as an unique identifier for given saved object
 */
export const getKey = ({ id, type }: ObjectReference) => `${type}|${id}`;

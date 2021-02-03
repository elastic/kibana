/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface Tag {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface TagAttributes {
  name: string;
  description: string;
  color: string;
}

export interface ITagsClient {
  create(attributes: TagAttributes): Promise<Tag>;
  get(id: string): Promise<Tag>;
  getAll(): Promise<Tag[]>;
  delete(id: string): Promise<void>;
  update(id: string, attributes: TagAttributes): Promise<Tag>;
}

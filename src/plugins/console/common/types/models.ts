/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TextObject } from '../text_object';

export interface IdObject {
  id: string;
}

export interface ObjectStorage<O extends IdObject> {
  /**
   * Creates a new object in the underlying persistance layer.
   *
   * @remarks Does not accept an ID, a new ID is generated and returned with the newly created object.
   */
  create(obj: Omit<O, 'id'>): Promise<O>;

  /**
   * This method should update specific object in the persistance layer.
   */
  update(obj: O): Promise<void>;

  /**
   * A function that will return all of the objects in the persistance layer.
   *
   * @remarks Unless an error is thrown this function should always return an array (empty if there are not objects present).
   */
  findAll(): Promise<O[]>;
}

export interface ObjectStorageClient {
  text: ObjectStorage<TextObject>;
}

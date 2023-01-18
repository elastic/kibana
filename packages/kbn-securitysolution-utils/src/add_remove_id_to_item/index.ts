/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuid } from 'uuid';

/**
 * This is useful for when you have arrays without an ID and need to add one for
 * ReactJS keys. I break the types slightly by introducing an id to an arbitrary item
 * but then cast it back to the regular type T.
 * Usage of this could be considered tech debt as I am adding an ID when the backend
 * could be doing the same thing but it depends on how you want to model your data and
 * if you view modeling your data with id's to please ReactJS a good or bad thing.
 * @param item The item to add an id to.
 */
type NotArray<T> = T extends unknown[] ? never : T;
export const addIdToItem = <T>(item: NotArray<T>): T => {
  const maybeId: typeof item & { id?: string } = item;
  if (maybeId.id != null) {
    return item;
  } else {
    return { ...item, id: uuid.v4() };
  }
};

/**
 * This is to reverse the id you added to your arrays for ReactJS keys.
 * @param item The item to remove the id from.
 */
export const removeIdFromItem = <T>(
  item: NotArray<T>
):
  | T
  | Pick<
      T & {
        id?: string | undefined;
      },
      Exclude<keyof T, 'id'>
    > => {
  const maybeId: typeof item & { id?: string } = item;
  if (maybeId.id != null) {
    const { id, ...noId } = maybeId;
    return noId;
  } else {
    return item;
  }
};

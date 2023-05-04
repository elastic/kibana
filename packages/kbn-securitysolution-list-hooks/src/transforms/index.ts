/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flow } from 'fp-ts/lib/function';
import { addIdToItem, removeIdFromItem } from '@kbn/securitysolution-utils';
import type {
  CreateExceptionListItemSchema,
  EntriesArray,
  Entry,
  ExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

// These are a collection of transforms that are UI specific and useful for UI concerns
// that are inserted between the API and the actual user interface. In some ways these
// might be viewed as technical debt or to compensate for the differences and preferences
// of how ReactJS might prefer data vs. how we want to model data. Each function should have
// a description giving context around the transform.

/**
 * Transforms the output of exception items to compensate for technical debt or UI concerns such as
 * ReactJS preferences for having ids within arrays if the data is not modeled that way.
 *
 * If you add a new transform of the output called "myNewTransform" do it
 * in the form of:
 * flow(removeIdFromExceptionItemsEntries, myNewTransform)(exceptionItem)
 *
 * @param exceptionItem The exceptionItem to transform the output of
 * @returns The exceptionItem transformed from the output
 */
export const transformOutput = (
  exceptionItem: UpdateExceptionListItemSchema | ExceptionListItemSchema
): UpdateExceptionListItemSchema | ExceptionListItemSchema =>
  flow(
    removeCreatedAtCreatedByFromCommentsOnUpdate,
    removeIdFromExceptionItemsEntries
  )(exceptionItem);

export const transformNewItemOutput = (
  exceptionItem: CreateExceptionListItemSchema
): CreateExceptionListItemSchema => flow(removeIdFromExceptionItemsEntries)(exceptionItem);

/**
 * Transforms the output of rules to compensate for technical debt or UI concerns such as
 * ReactJS preferences for having ids within arrays if the data is not modeled that way.
 *
 * If you add a new transform of the input called "myNewTransform" do it
 * in the form of:
 * flow(addIdToExceptionItemEntries, myNewTransform)(exceptionItem)
 *
 * @param exceptionItem The exceptionItem to transform the output of
 * @returns The exceptionItem transformed from the output
 */
export const transformInput = (exceptionItem: ExceptionListItemSchema): ExceptionListItemSchema =>
  flow(addIdToExceptionItemEntries)(exceptionItem);

/**
 * This adds an id to the incoming exception item entries as ReactJS prefers to have
 * an id added to them for use as a stable id. Later if we decide to change the data
 * model to have id's within the array then this code should be removed. If not, then
 * this code should stay as an adapter for ReactJS.
 *
 * This does break the type system slightly as we are lying a bit to the type system as we return
 * the same exceptionItem as we have previously but are augmenting the arrays with an id which TypeScript
 * doesn't mind us doing here. However, downstream you will notice that you have an id when the type
 * does not indicate it. In that case use (ExceptionItem & { id: string }) temporarily if you're using the id. If you're not,
 * you can ignore the id and just use the normal TypeScript with ReactJS.
 *
 * @param exceptionItem The exceptionItem to add an id to the threat matches.
 * @returns exceptionItem The exceptionItem but with id added to the exception item entries
 */
export const addIdToExceptionItemEntries = (
  exceptionItem: ExceptionListItemSchema
): ExceptionListItemSchema => {
  const entries = exceptionItem.entries.map((entry) => {
    if (entry.type === 'nested') {
      return addIdToItem({
        ...entry,
        entries: entry.entries.map((nestedEntry) => addIdToItem(nestedEntry)),
      });
    } else {
      return addIdToItem(entry);
    }
  });
  return { ...exceptionItem, entries };
};

/**
 * This removes an id from the exceptionItem entries as ReactJS prefers to have
 * an id added to them for use as a stable id. Later if we decide to change the data
 * model to have id's within the array then this code should be removed. If not, then
 * this code should stay as an adapter for ReactJS.
 *
 * @param exceptionItem The exceptionItem to remove an id from the entries.
 * @returns exceptionItem The exceptionItem but with id removed from the entries
 */
export const removeIdFromExceptionItemsEntries = <T extends { entries: EntriesArray }>(
  exceptionItem: T
): T => {
  const { entries } = exceptionItem;
  const entriesNoId = entries.map((entry) => {
    if (entry.type === 'nested') {
      return removeIdFromItem({
        ...entry,
        entries: entry.entries.map((nestedEntry) => removeIdFromItem(nestedEntry)),
      });
    } else {
      return removeIdFromItem<Entry>(entry);
    }
  });
  return { ...exceptionItem, entries: entriesNoId };
};

/**
 * This removes createdAt, createdBy from the exceptionItem if  a comment was added to
 * the Exception item, and return the comment message with id to prevent creating the commet
 * twice
 * @param exceptionItem The exceptionItem to remove createdAt, createdBy from the comments array.
 * @returns exceptionItem The exceptionItem with comments do  not have createdAt, createdBy.
 */
export const removeCreatedAtCreatedByFromCommentsOnUpdate = (
  exceptionItem: UpdateExceptionListItemSchema | ExceptionListItemSchema
) => {
  const { comments } = exceptionItem;
  if (!comments || !comments.length) return exceptionItem;

  const entriesNoCreatedAtAndBy = comments.map(({ comment, id }) => ({
    comment,
    id,
  }));
  return { ...exceptionItem, comments: entriesNoCreatedAtAndBy };
};

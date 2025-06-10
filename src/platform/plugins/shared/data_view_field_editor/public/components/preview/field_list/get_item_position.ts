/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DocumentField } from './field_list';

export function getPositionAfterToggling(
  fieldName: string,
  pinnedFields: Record<string, boolean>,
  fieldList: DocumentField[]
) {
  const isPinned = pinnedFields[fieldName];
  return isPinned
    ? getItemPositionAfterUnpinning(fieldName, pinnedFields, fieldList)
    : getItemPositionAfterPinning(fieldName, fieldList);
}

function getItemPositionAfterUnpinning(
  fieldName: string,
  pinnedFields: Record<string, boolean>,
  fieldList: DocumentField[]
) {
  // There's one pinned field less since we are unpinning the item
  const pinnedFieldsLength = Object.values(pinnedFields).filter(Boolean).length - 1;
  const unpinnedItems = fieldList.filter(
    (item) => !pinnedFields[item.key] || item.key === fieldName
  );

  // The unpinned items are placed after the pinned items so we can just find the index of the item in the unpinned items
  // and add the number of pinned items to it
  const newItemIndex =
    pinnedFieldsLength + unpinnedItems.findIndex((item) => item.key === fieldName);
  return newItemIndex;
}

function getItemPositionAfterPinning(fieldName: string, fieldList: DocumentField[]) {
  const pinnedItems = [];

  for (const item of fieldList) {
    if (item.isPinned) {
      pinnedItems.push(fieldName);
    }

    // If we reach the item we are pinning, we stop since that's the position it will be in
    if (item.key === fieldName) {
      break;
    }
  }

  return pinnedItems.length;
}

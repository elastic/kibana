/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escapeRegExp } from 'lodash/fp';
import { getFieldSubtypeNested } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

/**
 * This function checks if the given field in a given index pattern is a nested field's parent.
 * Discover doesn't flatten arrays of objects, so for documents with an `object` or `nested` field that
 * contains an array, Discover will only detect the top level root field. We want to detect when those
 * root fields are `nested` so that we can display the proper icon and label. However, those root
 * `nested` fields are not a part of the index pattern. Their children are though, and contain nested path
 * info. So to detect nested fields we look through the index pattern for nested children
 * whose path begins with the current field. There are edge cases where
 * this could incorrectly identify a plain `object` field as `nested`. Say we had the following document
 * where `foo` is a plain object field and `bar` is a nested field.
 * {
 *   "foo": [
 *   {
 *     "bar": [
 *       {
 *         "baz": "qux"
 *       }
 *     ]
 *   },
 *   {
 *     "bar": [
 *       {
 *         "baz": "qux"
 *       }
 *     ]
 *   }
 * ]
 * }
 * The following code will search for `foo`, find it at the beginning of the path to the nested child field
 * `foo.bar.baz` and incorrectly mark `foo` as nested. Any time we're searching for the name of a plain object
 * field that happens to match a segment of a nested path, we'll get a false positive.
 * We're aware of this issue and we'll have to live with
 * it in the short term. The long term fix will be to add info about the `nested` and `object` root fields
 * to the index pattern, but that has its own complications which you can read more about in the following
 * issue: https://github.com/elastic/kibana/issues/54957
 */
export function isNestedFieldParent(fieldName: string, indexPattern: DataView): boolean {
  return (
    !indexPattern.fields.getByName(fieldName) &&
    !!indexPattern.fields.getAll().find((patternField) => {
      // We only want to match a full path segment
      const nestedRootRegex = new RegExp(escapeRegExp(fieldName) + '(\\.|$)');
      const subTypeNested = getFieldSubtypeNested(patternField);
      return nestedRootRegex.test(subTypeNested?.nested.path ?? '');
    })
  );
}

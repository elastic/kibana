/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe, forEach } from 'lodash/fp';
import { escapeKuery, KueryNode, nodeBuilder, nodeTypes } from '@kbn/es-query';

import { getFlattenedObject } from '@kbn/std';

import { FileMetadata, FileStatus } from '../../../../common/types';
import { FindFileArgs } from '../../../file_service';

const deletedStatus: FileStatus = 'DELETED';

export function filterDeletedFiles({ attrPrefix }: { attrPrefix: string }): KueryNode {
  return nodeTypes.function.buildNode('not', nodeBuilder.is(`${attrPrefix}.Status`, deletedStatus));
}

export function filterArgsToKuery({
  extension,
  mimeType,
  kind,
  meta,
  name,
  status,
  user,
  attrPrefix = '',
}: Omit<FindFileArgs, 'page' | 'perPage'> & { attrPrefix?: string }): KueryNode {
  const kueryExpressions: KueryNode[] = [filterDeletedFiles({ attrPrefix })];

  const addFilters = (
    fieldName: keyof FileMetadata | string,
    values: string[] = [],
    isWildcard = false
  ): void => {
    if (values.length) {
      const orExpressions = values
        .filter(Boolean)
        .map((value) =>
          nodeBuilder.is(
            `${attrPrefix}.${fieldName}`,
            isWildcard ? nodeTypes.wildcard.buildNode(value) : escapeKuery(value)
          )
        );
      kueryExpressions.push(nodeBuilder.or(orExpressions));
    }
  };

  addFilters('name', name, true);
  addFilters('FileKind', kind);
  addFilters('Status', status);
  addFilters('extension', extension);
  addFilters('mime_type', mimeType);
  addFilters('user.id', user);

  if (meta) {
    const addMetaFilters = pipe(
      getFlattenedObject,
      Object.entries,
      forEach(([fieldName, value]) => {
        addFilters(
          `Meta.${fieldName}` as keyof FileMetadata,
          Array.isArray(value) ? value : [value],
          true
        );
      })
    );
    addMetaFilters(meta);
  }

  return nodeBuilder.and(kueryExpressions);
}

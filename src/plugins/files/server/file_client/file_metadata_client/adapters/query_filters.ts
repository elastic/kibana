/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  kind,
  meta,
  name,
  status,
  attrPrefix = '',
}: Omit<FindFileArgs, 'page' | 'perPage'> & { attrPrefix?: string }): KueryNode {
  const kueryExpressions: KueryNode[] = [filterDeletedFiles({ attrPrefix })];

  const addFilters = (
    fieldName: keyof FileMetadata,
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

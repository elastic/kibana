/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createModelVersionTestMigrator,
  type ModelVersionTestMigrator,
} from '@kbn/core-test-helpers-model-versions';
import { querySavedObjectType } from './query';

describe('saved query model version transformations', () => {
  let migrator: ModelVersionTestMigrator;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({ type: querySavedObjectType });
  });

  describe('model version 2', () => {
    const query = {
      id: 'some-id',
      type: 'query',
      attributes: {
        title: 'Some Title',
        description: 'some description',
        query: { language: 'kuery', query: 'some query' },
      },
      references: [],
    };

    it('should properly backfill the titleKeyword field when converting from v1 to v2', () => {
      const migrated = migrator.migrate({
        document: query,
        fromVersion: 1,
        toVersion: 2,
      });

      expect(migrated.attributes).toEqual({
        ...query.attributes,
        titleKeyword: query.attributes.title,
      });
    });

    it('should properly remove the titleKeyword field when converting from v2 to v1', () => {
      const migrated = migrator.migrate({
        document: {
          ...query,
          attributes: { ...query.attributes, titleKeyword: query.attributes.title },
        },
        fromVersion: 2,
        toVersion: 1,
      });

      expect(migrated.attributes).toEqual(query.attributes);
    });
  });
});

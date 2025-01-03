/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { type Transform, TransformType } from './types';
import { transformComparator, downgradeRequired } from './utils';

describe('transformComparator', () => {
  const core1 = { version: '1.0.0', transformType: TransformType.Core } as Transform;
  const core5 = { version: '5.0.0', transformType: TransformType.Core } as Transform;
  const core6 = { version: '6.0.0', transformType: TransformType.Core } as Transform;
  const reference1 = { version: '1.0.0', transformType: TransformType.Reference } as Transform;
  const reference2 = { version: '2.0.0', transformType: TransformType.Reference } as Transform;
  const convert1 = { version: '1.0.0', transformType: TransformType.Convert } as Transform;
  const convert5 = { version: '5.0.0', transformType: TransformType.Convert } as Transform;
  const migrate1 = { version: '1.0.0', transformType: TransformType.Migrate } as Transform;
  const migrate2 = { version: '2.0.0', transformType: TransformType.Migrate } as Transform;
  const migrate5 = { version: '5.0.0', transformType: TransformType.Migrate } as Transform;

  it.each`
    transforms                                               | expected
    ${[migrate1, reference1, core1, convert1]}               | ${[core1, reference1, convert1, migrate1]}
    ${[reference1, migrate1, core1, core5, core6, convert1]} | ${[core1, core5, core6, reference1, convert1, migrate1]}
    ${[reference2, reference1, migrate1, core6, convert5]}   | ${[core6, reference1, migrate1, reference2, convert5]}
    ${[migrate5, convert5, core5, migrate2]}                 | ${[core5, migrate2, convert5, migrate5]}
  `('should sort transforms correctly', ({ transforms, expected }) => {
    expect(transforms.sort(transformComparator)).toEqual(expected);
  });
});

describe('downgradeRequired', () => {
  const createDoc = (parts: Partial<SavedObjectUnsanitizedDoc>): SavedObjectUnsanitizedDoc => ({
    type: 'type',
    id: 'id',
    attributes: {},
    ...parts,
  });

  it('returns false when there is an higher convert version than the typeMigrationVersion', () => {
    const doc = createDoc({
      typeMigrationVersion: '8.0.0',
    });
    const latestVersions = {
      [TransformType.Convert]: '8.1.0',
    } as Record<TransformType, string>;

    expect(downgradeRequired(doc, latestVersions)).toEqual(false);
  });

  it('returns false when there is an higher convert version than the migrationVersion', () => {
    const doc = createDoc({
      migrationVersion: {
        type: '8.0.0',
      },
    });
    const latestVersions = {
      [TransformType.Convert]: '8.1.0',
    } as Record<TransformType, string>;

    expect(downgradeRequired(doc, latestVersions)).toEqual(false);
  });

  it('returns false when there is an higher migrate version than the typeMigrationVersion', () => {
    const doc = createDoc({
      typeMigrationVersion: '8.0.0',
    });
    const latestVersions = {
      [TransformType.Migrate]: '8.1.0',
    } as Record<TransformType, string>;

    expect(downgradeRequired(doc, latestVersions)).toEqual(false);
  });

  it('returns false when there is an higher migrate version than the migrationVersion', () => {
    const doc = createDoc({
      migrationVersion: {
        type: '8.0.0',
      },
    });
    const latestVersions = {
      [TransformType.Migrate]: '8.1.0',
    } as Record<TransformType, string>;

    expect(downgradeRequired(doc, latestVersions)).toEqual(false);
  });

  it('returns true when there is no higher convert version than the typeMigrationVersion', () => {
    const doc = createDoc({
      typeMigrationVersion: '8.0.0',
    });
    const latestVersions = {
      [TransformType.Convert]: '7.1.0',
    } as Record<TransformType, string>;

    expect(downgradeRequired(doc, latestVersions)).toEqual(true);
  });

  it('returns true when there is no higher convert version than the migrationVersion', () => {
    const doc = createDoc({
      migrationVersion: {
        type: '8.0.0',
      },
    });
    const latestVersions = {
      [TransformType.Convert]: '7.1.0',
    } as Record<TransformType, string>;

    expect(downgradeRequired(doc, latestVersions)).toEqual(true);
  });

  it('returns true when there is no higher migrate version than the typeMigrationVersion', () => {
    const doc = createDoc({
      typeMigrationVersion: '8.0.0',
    });
    const latestVersions = {
      [TransformType.Migrate]: '7.1.0',
    } as Record<TransformType, string>;

    expect(downgradeRequired(doc, latestVersions)).toEqual(true);
  });

  it('returns true when there is no higher migrate version than the migrationVersion', () => {
    const doc = createDoc({
      migrationVersion: {
        type: '8.0.0',
      },
    });
    const latestVersions = {
      [TransformType.Migrate]: '7.1.0',
    } as Record<TransformType, string>;

    expect(downgradeRequired(doc, latestVersions)).toEqual(true);
  });

  it('returns false when the document has no explicit version', () => {
    const doc = createDoc({});
    const latestVersions = {
      [TransformType.Migrate]: '8.0.0',
    } as Record<TransformType, string>;

    expect(downgradeRequired(doc, latestVersions)).toEqual(false);
  });

  it('returns false when latestVersions no explicit version', () => {
    const doc = createDoc({
      typeMigrationVersion: '8.0.0',
    });
    const latestVersions = {} as Record<TransformType, string>;

    expect(downgradeRequired(doc, latestVersions)).toEqual(false);
  });

  it('returns true when targetTypeVersion is specified and lower than the document version', () => {
    const doc = createDoc({
      typeMigrationVersion: '8.0.0',
    });
    const latestVersions = {
      [TransformType.Migrate]: '8.5.0',
    } as Record<TransformType, string>;
    const targetTypeVersion = '7.9.0';

    expect(downgradeRequired(doc, latestVersions, targetTypeVersion)).toEqual(true);
  });

  it('returns false when targetTypeVersion is specified and higher than the document version', () => {
    const doc = createDoc({
      typeMigrationVersion: '8.0.0',
    });
    const latestVersions = {
      [TransformType.Migrate]: '7.9.0',
    } as Record<TransformType, string>;
    const targetTypeVersion = '8.5.0';

    expect(downgradeRequired(doc, latestVersions, targetTypeVersion)).toEqual(false);
  });

  it('returns false when targetTypeVersion is specified and the same as the document version', () => {
    const doc = createDoc({
      typeMigrationVersion: '8.0.0',
    });
    const latestVersions = {
      [TransformType.Migrate]: '7.9.0',
    } as Record<TransformType, string>;
    const targetTypeVersion = '8.0.0';

    expect(downgradeRequired(doc, latestVersions, targetTypeVersion)).toEqual(false);
  });
});

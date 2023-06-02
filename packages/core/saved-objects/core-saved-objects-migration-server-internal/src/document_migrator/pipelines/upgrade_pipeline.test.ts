/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { modelVersionToVirtualVersion } from '@kbn/core-saved-objects-base-server-internal';
import { Transform, TransformType, TypeTransforms, TransformFn } from '../types';
import { DocumentUpgradePipeline } from './upgrade_pipeline';

// snake case is way better for migration function names in this very specific scenario.
/* eslint-disable @typescript-eslint/naming-convention */

describe('DocumentMigratorPipeline', () => {
  const defaultKibanaVersion = '8.8.0';

  const createDoc = (
    parts: Partial<SavedObjectUnsanitizedDoc<any>> = {}
  ): SavedObjectUnsanitizedDoc<any> => ({
    id: 'test-doc',
    type: 'test-type',
    attributes: {},
    references: [],
    coreMigrationVersion: defaultKibanaVersion,
    ...parts,
  });

  const latestVersions = (
    parts: Partial<Record<TransformType, string>> = {}
  ): Record<TransformType, string> => ({
    [TransformType.Convert]: defaultKibanaVersion,
    [TransformType.Migrate]: defaultKibanaVersion,
    [TransformType.Core]: defaultKibanaVersion,
    [TransformType.Reference]: defaultKibanaVersion,
    ...parts,
  });

  const getTypeTransforms = (transforms: Transform[]): TypeTransforms => {
    const versions = _.chain(transforms)
      .groupBy('transformType')
      .mapValues((items) => _.last(items)?.version)
      .value() as Record<TransformType, string>;

    return {
      transforms,
      immediateVersion: latestVersions(versions),
      latestVersion: latestVersions(versions),
      versionSchemas: {},
    };
  };

  const createTransformFn = (impl?: TransformFn): jest.MockedFunction<TransformFn> => {
    const defaultImpl: TransformFn = (doc) => ({ transformedDoc: doc, additionalDocs: [] });
    return jest.fn().mockImplementation(impl ?? defaultImpl);
  };

  describe('upward conversions', () => {
    it('calls a single `Migrate` conversion function', () => {
      const document = createDoc({
        id: 'foo-1',
        type: 'foo',
        typeMigrationVersion: '8.5.0',
      });

      const migrate8_8_0_up = createTransformFn();

      const fooTransforms = getTypeTransforms([
        { transformType: TransformType.Migrate, version: '8.8.0', transform: migrate8_8_0_up },
      ]);

      const pipeline = new DocumentUpgradePipeline({
        document,
        kibanaVersion: '8.8.0',
        convertNamespaceTypes: false,
        migrations: {
          foo: fooTransforms,
        },
      });

      const { document: outputDoc } = pipeline.run();

      expect(migrate8_8_0_up).toHaveBeenCalledTimes(1);
      expect(migrate8_8_0_up).toHaveBeenCalledWith(document);

      expect(outputDoc.typeMigrationVersion).toEqual('8.8.0');
    });

    it('calls multiple `Migrate` conversion function in order', () => {
      const document = createDoc({
        id: 'foo-1',
        type: 'foo',
        typeMigrationVersion: '8.5.0',
      });

      const migrate8_6_0_up = createTransformFn();
      const migrate8_7_0_up = createTransformFn();
      const migrate8_8_0_up = createTransformFn();

      const fooTransforms = getTypeTransforms([
        { transformType: TransformType.Migrate, version: '8.6.0', transform: migrate8_6_0_up },
        { transformType: TransformType.Migrate, version: '8.7.0', transform: migrate8_7_0_up },
        { transformType: TransformType.Migrate, version: '8.8.0', transform: migrate8_8_0_up },
      ]);

      const pipeline = new DocumentUpgradePipeline({
        document,
        kibanaVersion: '8.8.0',
        convertNamespaceTypes: false,
        migrations: {
          foo: fooTransforms,
        },
      });

      const { document: outputDoc } = pipeline.run();

      expect(migrate8_6_0_up).toHaveBeenCalledTimes(1);
      expect(migrate8_6_0_up).toHaveBeenCalledWith(document);

      expect(migrate8_7_0_up).toHaveBeenCalledTimes(1);
      expect(migrate8_7_0_up).toHaveBeenCalledWith({ ...document, typeMigrationVersion: '8.6.0' });

      expect(migrate8_8_0_up).toHaveBeenCalledTimes(1);
      expect(migrate8_8_0_up).toHaveBeenCalledWith({ ...document, typeMigrationVersion: '8.7.0' });

      expect(migrate8_6_0_up.mock.invocationCallOrder[0]).toBeLessThan(
        migrate8_7_0_up.mock.invocationCallOrder[0]
      );
      expect(migrate8_7_0_up.mock.invocationCallOrder[0]).toBeLessThan(
        migrate8_8_0_up.mock.invocationCallOrder[0]
      );

      expect(outputDoc.typeMigrationVersion).toEqual('8.8.0');
    });

    it('skips `Migrate` conversion function lower or equal to the document version', () => {
      const document = createDoc({
        id: 'foo-1',
        type: 'foo',
        typeMigrationVersion: '8.7.0',
      });

      const migrate8_6_0_up = createTransformFn();
      const migrate8_7_0_up = createTransformFn();
      const migrate8_8_0_up = createTransformFn();

      const fooTransforms = getTypeTransforms([
        { transformType: TransformType.Migrate, version: '8.6.0', transform: migrate8_6_0_up },
        { transformType: TransformType.Migrate, version: '8.7.0', transform: migrate8_7_0_up },
        { transformType: TransformType.Migrate, version: '8.8.0', transform: migrate8_8_0_up },
      ]);

      const pipeline = new DocumentUpgradePipeline({
        document,
        kibanaVersion: '8.8.0',
        convertNamespaceTypes: false,
        migrations: {
          foo: fooTransforms,
        },
      });

      const { document: outputDoc } = pipeline.run();

      expect(migrate8_6_0_up).not.toHaveBeenCalled();

      expect(migrate8_7_0_up).not.toHaveBeenCalled();

      expect(migrate8_8_0_up).toHaveBeenCalledTimes(1);
      expect(migrate8_8_0_up).toHaveBeenCalledWith({ ...document, typeMigrationVersion: '8.7.0' });

      expect(outputDoc.typeMigrationVersion).toEqual('8.8.0');
    });

    it('throws an error when trying to convert a document from a higher version', () => {
      const document = createDoc({
        id: 'foo-1',
        type: 'foo',
        typeMigrationVersion: '8.9.0',
      });

      const migrate8_8_0_up = createTransformFn();

      const fooTransforms = getTypeTransforms([
        { transformType: TransformType.Migrate, version: '8.8.0', transform: migrate8_8_0_up },
      ]);

      const pipeline = new DocumentUpgradePipeline({
        document,
        kibanaVersion: '8.8.0',
        convertNamespaceTypes: false,
        migrations: {
          foo: fooTransforms,
        },
      });

      expect(() => pipeline.run()).toThrowErrorMatchingInlineSnapshot(
        `"Document \\"foo-1\\" belongs to a more recent version of Kibana [8.9.0] when the last known version is [8.8.0]."`
      );
    });

    it('do not throw when converting a document to a virtual model version', () => {
      const document = createDoc({
        id: 'foo-1',
        type: 'foo',
        typeMigrationVersion: '8.6.0',
      });

      const migrate8_8_0_up = createTransformFn();

      const virtualModelVersion_3 = modelVersionToVirtualVersion(3);
      const migrate_mv_3 = createTransformFn();

      const fooTransforms = getTypeTransforms([
        { transformType: TransformType.Migrate, version: '8.8.0', transform: migrate8_8_0_up },
        {
          transformType: TransformType.Migrate,
          version: virtualModelVersion_3,
          transform: migrate_mv_3,
        },
      ]);

      const pipeline = new DocumentUpgradePipeline({
        document,
        kibanaVersion: '8.8.0',
        convertNamespaceTypes: false,
        migrations: {
          foo: fooTransforms,
        },
      });

      const { document: outputDoc } = pipeline.run();

      expect(migrate8_8_0_up).toHaveBeenCalledTimes(1);
      expect(migrate8_8_0_up).toHaveBeenCalledWith({ ...document });

      expect(migrate_mv_3).toHaveBeenCalledTimes(1);
      expect(migrate_mv_3).toHaveBeenCalledWith({ ...document, typeMigrationVersion: '8.8.0' });

      expect(migrate8_8_0_up.mock.invocationCallOrder[0]).toBeLessThan(
        migrate_mv_3.mock.invocationCallOrder[0]
      );

      expect(outputDoc.typeMigrationVersion).toEqual(virtualModelVersion_3);
    });

    it('supports specifying a `targetTypeVersion` and only run migrate transforms up to it', () => {
      const document = createDoc({
        id: 'foo-1',
        type: 'foo',
        typeMigrationVersion: '8.5.0',
      });

      const migrate8_6_0_up = createTransformFn();
      const migrate8_7_0_up = createTransformFn();
      const migrate8_8_0_up = createTransformFn();

      const fooTransforms = getTypeTransforms([
        { transformType: TransformType.Migrate, version: '8.6.0', transform: migrate8_6_0_up },
        { transformType: TransformType.Migrate, version: '8.7.0', transform: migrate8_7_0_up },
        { transformType: TransformType.Migrate, version: '8.8.0', transform: migrate8_8_0_up },
      ]);

      const pipeline = new DocumentUpgradePipeline({
        document,
        kibanaVersion: '8.8.0',
        convertNamespaceTypes: false,
        migrations: {
          foo: fooTransforms,
        },
        targetTypeVersion: '8.7.0',
      });

      const { document: outputDoc } = pipeline.run();

      expect(migrate8_6_0_up).toHaveBeenCalledTimes(1);
      expect(migrate8_6_0_up).toHaveBeenCalledWith({ ...document });

      expect(migrate8_7_0_up).toHaveBeenCalledTimes(1);
      expect(migrate8_7_0_up).toHaveBeenCalledWith({ ...document, typeMigrationVersion: '8.6.0' });

      expect(migrate8_8_0_up).not.toHaveBeenCalled();

      expect(outputDoc.typeMigrationVersion).toEqual('8.7.0');
    });
  });
});

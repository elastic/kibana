/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { Transform, TransformType, TypeTransforms, TransformFn, TypeVersionSchema } from '../types';
import { DocumentDowngradePipeline } from './downgrade_pipeline';

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

  const createSchema = (): jest.MockedFunction<TypeVersionSchema> => {
    return jest.fn().mockImplementation((doc: unknown) => doc);
  };

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

  it('calls multiple `Migrate` transform functions in order', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
      typeMigrationVersion: '8.8.0',
    });

    const migrate8_6_0_up = createTransformFn();
    const migrate8_6_0_down = createTransformFn();
    const migrate8_7_0_up = createTransformFn();
    const migrate8_7_0_down = createTransformFn();
    const migrate8_8_0_up = createTransformFn();
    const migrate8_8_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Migrate,
        version: '8.6.0',
        transform: migrate8_6_0_up,
        transformDown: migrate8_6_0_down,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.7.0',
        transform: migrate8_7_0_up,
        transformDown: migrate8_7_0_down,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.8.0',
        transform: migrate8_8_0_up,
        transformDown: migrate8_8_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.8.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.5.0',
    });

    const { document: outputDoc } = pipeline.run();

    expect(migrate8_6_0_up).not.toHaveBeenCalled();
    expect(migrate8_7_0_up).not.toHaveBeenCalled();
    expect(migrate8_8_0_up).not.toHaveBeenCalled();

    expect(migrate8_8_0_down).toHaveBeenCalledTimes(1);
    expect(migrate8_8_0_down).toHaveBeenCalledWith(document);

    expect(migrate8_7_0_down).toHaveBeenCalledTimes(1);
    expect(migrate8_7_0_down).toHaveBeenCalledWith({ ...document, typeMigrationVersion: '8.8.0' });

    expect(migrate8_6_0_down).toHaveBeenCalledTimes(1);
    expect(migrate8_6_0_down).toHaveBeenCalledWith({ ...document, typeMigrationVersion: '8.7.0' });

    expect(migrate8_8_0_down.mock.invocationCallOrder[0]).toBeLessThan(
      migrate8_7_0_down.mock.invocationCallOrder[0]
    );
    expect(migrate8_7_0_down.mock.invocationCallOrder[0]).toBeLessThan(
      migrate8_6_0_down.mock.invocationCallOrder[0]
    );

    expect(outputDoc.typeMigrationVersion).toEqual('8.5.0');
  });

  it('does not call transforms with versions equal or below the requested version', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
      typeMigrationVersion: '8.8.0',
    });

    const migrate8_6_0_up = createTransformFn();
    const migrate8_6_0_down = createTransformFn();
    const migrate8_7_0_up = createTransformFn();
    const migrate8_7_0_down = createTransformFn();
    const migrate8_8_0_up = createTransformFn();
    const migrate8_8_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Migrate,
        version: '8.6.0',
        transform: migrate8_6_0_up,
        transformDown: migrate8_6_0_down,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.7.0',
        transform: migrate8_7_0_up,
        transformDown: migrate8_7_0_down,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.8.0',
        transform: migrate8_8_0_up,
        transformDown: migrate8_8_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.8.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.7.0',
    });

    const { document: outputDoc } = pipeline.run();

    expect(migrate8_6_0_up).not.toHaveBeenCalled();
    expect(migrate8_7_0_up).not.toHaveBeenCalled();
    expect(migrate8_8_0_up).not.toHaveBeenCalled();

    expect(migrate8_8_0_down).toHaveBeenCalledTimes(1);
    expect(migrate8_8_0_down).toHaveBeenCalledWith(document);

    expect(migrate8_7_0_down).not.toHaveBeenCalled();
    expect(migrate8_6_0_down).not.toHaveBeenCalled();

    expect(outputDoc.typeMigrationVersion).toEqual('8.7.0');
  });

  it('skips transforms without down fn', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
      typeMigrationVersion: '8.8.0',
    });

    const migrate8_6_0_up = createTransformFn();
    const migrate8_6_0_down = createTransformFn();
    const migrate8_7_0_up = createTransformFn();
    const migrate8_8_0_up = createTransformFn();
    const migrate8_8_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Migrate,
        version: '8.6.0',
        transform: migrate8_6_0_up,
        transformDown: migrate8_6_0_down,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.7.0',
        transform: migrate8_7_0_up,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.8.0',
        transform: migrate8_8_0_up,
        transformDown: migrate8_8_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.8.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.5.0',
    });

    pipeline.run();

    expect(migrate8_6_0_down).toHaveBeenCalledTimes(1);
    expect(migrate8_8_0_down).toHaveBeenCalledTimes(1);
  });

  it('throws trying to downgrade to a higher version', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
      typeMigrationVersion: '8.7.0',
    });

    const migrate8_6_0_up = createTransformFn();
    const migrate8_6_0_down = createTransformFn();
    const migrate8_7_0_up = createTransformFn();
    const migrate8_8_0_up = createTransformFn();
    const migrate8_8_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Migrate,
        version: '8.6.0',
        transform: migrate8_6_0_up,
        transformDown: migrate8_6_0_down,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.7.0',
        transform: migrate8_7_0_up,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.8.0',
        transform: migrate8_8_0_up,
        transformDown: migrate8_8_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.8.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.8.0',
    });

    expect(() => pipeline.run()).toThrowErrorMatchingInlineSnapshot(
      `"Trying to transform down to a higher version: 8.7.0 to 8.8.0"`
    );
  });

  it('calls no transforms when converting down to the same version', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
      typeMigrationVersion: '8.7.0',
    });

    const migrate8_6_0_up = createTransformFn();
    const migrate8_6_0_down = createTransformFn();
    const migrate8_7_0_up = createTransformFn();
    const migrate8_7_0_down = createTransformFn();
    const migrate8_8_0_up = createTransformFn();
    const migrate8_8_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Migrate,
        version: '8.6.0',
        transform: migrate8_6_0_up,
        transformDown: migrate8_6_0_down,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.7.0',
        transform: migrate8_7_0_up,
        transformDown: migrate8_7_0_down,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.8.0',
        transform: migrate8_8_0_up,
        transformDown: migrate8_8_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.8.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.7.0',
    });

    const { document: outputDoc } = pipeline.run();

    expect(migrate8_6_0_down).not.toHaveBeenCalled();
    expect(migrate8_7_0_down).not.toHaveBeenCalled();
    expect(migrate8_8_0_down).not.toHaveBeenCalled();

    expect(outputDoc.typeMigrationVersion).toEqual('8.7.0');
  });

  it('considers undefined typeMigrationVersion as being the highest current version', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
    });
    document.typeMigrationVersion = undefined;

    const migrate8_6_0_up = createTransformFn();
    const migrate8_6_0_down = createTransformFn();
    const migrate8_7_0_up = createTransformFn();
    const migrate8_7_0_down = createTransformFn();
    const migrate8_8_0_up = createTransformFn();
    const migrate8_8_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Migrate,
        version: '8.6.0',
        transform: migrate8_6_0_up,
        transformDown: migrate8_6_0_down,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.7.0',
        transform: migrate8_7_0_up,
        transformDown: migrate8_7_0_down,
      },
      {
        transformType: TransformType.Migrate,
        version: '8.8.0',
        transform: migrate8_8_0_up,
        transformDown: migrate8_8_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.8.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.5.0',
    });

    const { document: outputDoc } = pipeline.run();

    expect(migrate8_6_0_up).not.toHaveBeenCalled();
    expect(migrate8_7_0_up).not.toHaveBeenCalled();
    expect(migrate8_8_0_up).not.toHaveBeenCalled();

    expect(migrate8_8_0_down).toHaveBeenCalledTimes(1);
    expect(migrate8_8_0_down).toHaveBeenCalledWith(document);

    expect(migrate8_7_0_down).toHaveBeenCalledTimes(1);
    expect(migrate8_7_0_down).toHaveBeenCalledWith({ ...document, typeMigrationVersion: '8.8.0' });

    expect(migrate8_6_0_down).toHaveBeenCalledTimes(1);
    expect(migrate8_6_0_down).toHaveBeenCalledWith({ ...document, typeMigrationVersion: '8.7.0' });

    expect(migrate8_8_0_down.mock.invocationCallOrder[0]).toBeLessThan(
      migrate8_7_0_down.mock.invocationCallOrder[0]
    );
    expect(migrate8_7_0_down.mock.invocationCallOrder[0]).toBeLessThan(
      migrate8_6_0_down.mock.invocationCallOrder[0]
    );

    expect(outputDoc.typeMigrationVersion).toEqual('8.5.0');
  });

  it('ignores convert type transforms', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
      coreMigrationVersion: '8.7.0',
      typeMigrationVersion: '8.7.0',
    });

    const migrate8_7_0_down = createTransformFn();
    const convert8_7_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Migrate,
        version: '8.7.0',
        transform: jest.fn(),
        transformDown: migrate8_7_0_down,
      },
      {
        transformType: TransformType.Convert,
        version: '8.7.0',
        transform: jest.fn(),
        transformDown: convert8_7_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.8.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.6.0',
    });

    const { document: outputDoc } = pipeline.run();

    expect(migrate8_7_0_down).toHaveBeenCalledTimes(1);
    expect(convert8_7_0_down).not.toHaveBeenCalled();

    expect(outputDoc.typeMigrationVersion).toEqual('8.6.0');
  });

  it('ignores reference type transforms', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
      coreMigrationVersion: '8.7.0',
      typeMigrationVersion: '8.7.0',
    });

    const migrate8_7_0_down = createTransformFn();
    const reference8_7_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Migrate,
        version: '8.7.0',
        transform: jest.fn(),
        transformDown: migrate8_7_0_down,
      },
      {
        transformType: TransformType.Reference,
        version: '8.7.0',
        transform: jest.fn(),
        transformDown: reference8_7_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.8.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.6.0',
    });

    const { document: outputDoc } = pipeline.run();

    expect(migrate8_7_0_down).toHaveBeenCalledTimes(1);
    expect(reference8_7_0_down).not.toHaveBeenCalled();

    expect(outputDoc.typeMigrationVersion).toEqual('8.6.0');
  });

  it('ignores core type transforms if targetCoreVersion is not specified', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
      coreMigrationVersion: '8.7.0',
      typeMigrationVersion: '8.7.0',
    });

    const migrate8_7_0_down = createTransformFn();
    const core8_7_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Migrate,
        version: '8.7.0',
        transform: jest.fn(),
        transformDown: migrate8_7_0_down,
      },
      {
        transformType: TransformType.Core,
        version: '8.7.0',
        transform: jest.fn(),
        transformDown: core8_7_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.8.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.6.0',
    });

    const { document: outputDoc } = pipeline.run();

    expect(migrate8_7_0_down).toHaveBeenCalledTimes(1);
    expect(core8_7_0_down).not.toHaveBeenCalled();

    expect(outputDoc.typeMigrationVersion).toEqual('8.6.0');
    expect(outputDoc.coreMigrationVersion).toEqual('8.7.0');
  });

  it('applies core type transforms if targetCoreVersion is specified', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
      coreMigrationVersion: '8.7.0',
      typeMigrationVersion: '8.7.0',
    });

    const migrate8_7_0_down = createTransformFn();
    const core8_7_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Migrate,
        version: '8.7.0',
        transform: jest.fn(),
        transformDown: migrate8_7_0_down,
      },
      {
        transformType: TransformType.Core,
        version: '8.7.0',
        transform: jest.fn(),
        transformDown: core8_7_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.8.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.6.0',
      targetCoreVersion: '8.6.0',
    });

    const { document: outputDoc } = pipeline.run();

    expect(migrate8_7_0_down).toHaveBeenCalledTimes(1);
    expect(core8_7_0_down).toHaveBeenCalledTimes(1);

    expect(outputDoc.typeMigrationVersion).toEqual('8.6.0');
    expect(outputDoc.coreMigrationVersion).toEqual('8.6.0');
  });

  it('applies all expected core type transforms when targetCoreVersion is specified', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
      coreMigrationVersion: '8.9.0',
      typeMigrationVersion: '8.8.0',
    });

    const core8_7_0_down = createTransformFn();
    const core8_8_0_down = createTransformFn();
    const core8_9_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Core,
        version: '8.7.0',
        transform: jest.fn(),
        transformDown: core8_7_0_down,
      },
      {
        transformType: TransformType.Core,
        version: '8.8.0',
        transform: jest.fn(),
        transformDown: core8_8_0_down,
      },
      {
        transformType: TransformType.Core,
        version: '8.9.0',
        transform: jest.fn(),
        transformDown: core8_9_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.9.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.7.0',
      targetCoreVersion: '8.7.0',
    });

    const { document: outputDoc } = pipeline.run();

    expect(core8_7_0_down).not.toHaveBeenCalled();
    expect(core8_8_0_down).toHaveBeenCalledTimes(1);
    expect(core8_9_0_down).toHaveBeenCalledTimes(1);

    expect(outputDoc.coreMigrationVersion).toEqual('8.7.0');
  });

  it('accepts converting documents from higher versions than the last known', () => {
    const document = createDoc({
      id: 'foo-1',
      type: 'foo',
      typeMigrationVersion: '8.10.0',
    });

    const migrate8_8_0_up = createTransformFn();
    const migrate8_8_0_down = createTransformFn();

    const fooTransforms = getTypeTransforms([
      {
        transformType: TransformType.Migrate,
        version: '8.8.0',
        transform: migrate8_8_0_up,
        transformDown: migrate8_8_0_down,
      },
    ]);

    const pipeline = new DocumentDowngradePipeline({
      document,
      kibanaVersion: '8.8.0',
      typeTransforms: fooTransforms,
      targetTypeVersion: '8.7.0',
    });

    const { document: outputDoc } = pipeline.run();

    expect(migrate8_8_0_up).not.toHaveBeenCalled();

    expect(migrate8_8_0_down).toHaveBeenCalledTimes(1);
    expect(migrate8_8_0_down).toHaveBeenCalledWith(document);

    expect(outputDoc.typeMigrationVersion).toEqual('8.7.0');
  });

  describe('version schemas', () => {
    it('apply the correct version schema', () => {
      const document = createDoc({
        id: 'foo-1',
        type: 'foo',
        typeMigrationVersion: '8.9.0',
      });

      const schema_8_7_0 = createSchema();
      const schema_8_8_0 = createSchema();
      const schema_8_9_0 = createSchema();

      const transforms: TypeTransforms = {
        transforms: [],
        latestVersion: latestVersions(),
        immediateVersion: latestVersions(),
        versionSchemas: {
          '8.7.0': schema_8_7_0,
          '8.8.0': schema_8_8_0,
          '8.9.0': schema_8_9_0,
        },
      };

      const pipeline = new DocumentDowngradePipeline({
        document,
        kibanaVersion: '8.8.0',
        typeTransforms: transforms,
        targetTypeVersion: '8.7.0',
      });

      const { document: outputDoc } = pipeline.run();

      expect(outputDoc.typeMigrationVersion).toEqual('8.7.0');
      expect(schema_8_7_0).toHaveBeenCalledTimes(1);
      expect(schema_8_8_0).not.toHaveBeenCalled();
      expect(schema_8_9_0).not.toHaveBeenCalled();
    });

    it('does not apply the schema if the exact version is missing', () => {
      const document = createDoc({
        id: 'foo-1',
        type: 'foo',
        typeMigrationVersion: '8.9.0',
      });

      const schema_8_8_0 = createSchema();
      const schema_8_9_0 = createSchema();

      const transforms: TypeTransforms = {
        transforms: [],
        latestVersion: latestVersions(),
        immediateVersion: latestVersions(),
        versionSchemas: {
          '8.8.0': schema_8_8_0,
          '8.9.0': schema_8_9_0,
        },
      };

      const pipeline = new DocumentDowngradePipeline({
        document,
        kibanaVersion: '8.8.0',
        typeTransforms: transforms,
        targetTypeVersion: '8.7.0',
      });

      const { document: outputDoc } = pipeline.run();

      expect(outputDoc.typeMigrationVersion).toEqual('8.7.0');
      expect(schema_8_8_0).not.toHaveBeenCalled();
      expect(schema_8_9_0).not.toHaveBeenCalled();
    });
  });
});

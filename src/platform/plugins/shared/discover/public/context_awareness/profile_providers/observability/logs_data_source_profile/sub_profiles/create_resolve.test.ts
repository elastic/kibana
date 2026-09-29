/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createStubIndexPattern } from '@kbn/data-views-plugin/common/data_view.stub';
import type { ContextWithProfileId } from '../../../../profile_service';
import { createEsqlDataSource } from '../../../../../../common/data_sources';
import type { DataSourceProfileProviderParams, RootContext } from '../../../../profiles';
import { SolutionType } from '../../../../profiles';
import { createResolve } from './create_resolve';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../../consts';
import { RESOLUTION_MATCH } from '../__mocks__/logs_data_source_resolution_match';

describe('createResolve', () => {
  const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
    profileId: OBSERVABILITY_ROOT_PROFILE_ID,
    solutionType: SolutionType.Observability,
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };
  const resolve = createResolve('valid');

  // Params whose data view resolves to the given concrete indices.
  const resolvedParams = (
    rootContext: ContextWithProfileId<RootContext>,
    matchedIndices: string[]
  ): DataSourceProfileProviderParams => {
    const dataView = createStubIndexPattern({ spec: { title: 'valid' } });
    dataView.matchedIndices = matchedIndices;

    return {
      rootContext,
      dataSource: createEsqlDataSource(),
      query: { esql: 'FROM valid' },
      dataView,
    };
  };

  // Params without a data view, so resolution falls back to the ES|QL index pattern.
  const esqlParams = (
    rootContext: ContextWithProfileId<RootContext>,
    indexPattern: string
  ): DataSourceProfileProviderParams => ({
    rootContext,
    dataSource: createEsqlDataSource(),
    query: { esql: `FROM ${indexPattern}` },
  });

  describe('using the resolved indices', () => {
    it('matches when every resolved index matches the base pattern', () => {
      expect(resolve(resolvedParams(ROOT_CONTEXT, ['valid']))).toEqual(RESOLUTION_MATCH);
    });

    it('does not match when a resolved index does not match the base pattern', () => {
      expect(resolve(resolvedParams(ROOT_CONTEXT, ['invalid']))).toEqual(RESOLUTION_MISMATCH);
    });

    it('does not match when only some resolved indices match the base pattern', () => {
      expect(resolve(resolvedParams(ROOT_CONTEXT, ['valid', 'invalid']))).toEqual(
        RESOLUTION_MISMATCH
      );
    });
  });

  describe('falling back to the index pattern when no indices are resolved', () => {
    it('matches a valid index pattern when there is no data view', () => {
      expect(resolve(esqlParams(ROOT_CONTEXT, 'valid'))).toEqual(RESOLUTION_MATCH);
    });

    it('does not match an invalid index pattern when there is no data view', () => {
      expect(resolve(esqlParams(ROOT_CONTEXT, 'invalid'))).toEqual(RESOLUTION_MISMATCH);
    });

    it('falls back to the index pattern when the data view resolves to no indices', () => {
      // Empty matchedIndices -> use the pattern from the query (FROM valid) -> match.
      expect(resolve(resolvedParams(ROOT_CONTEXT, []))).toEqual(RESOLUTION_MATCH);
    });
  });

  it('should match in Classic but not other solution views', () => {
    expect(resolve(resolvedParams(ROOT_CONTEXT, ['valid']))).toEqual(RESOLUTION_MATCH);
    expect(
      resolve(
        resolvedParams({ profileId: 'other-root-profile', solutionType: SolutionType.Default }, [
          'valid',
        ])
      )
    ).toEqual(RESOLUTION_MATCH);
    expect(
      resolve(
        resolvedParams({ profileId: 'other-root-profile', solutionType: SolutionType.Search }, [
          'valid',
        ])
      )
    ).toEqual(RESOLUTION_MISMATCH);
    expect(
      resolve(
        resolvedParams({ profileId: 'other-root-profile', solutionType: SolutionType.Security }, [
          'valid',
        ])
      )
    ).toEqual(RESOLUTION_MISMATCH);
  });
});

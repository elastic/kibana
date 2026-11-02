/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createStubIndexPattern } from '@kbn/data-views-plugin/common/data_view.stub';
import { createProfileProviderSharedServicesMock } from '../../../../__mocks__';
import type { ContextWithProfileId } from '../../../../profile_service';
import { createEsqlDataSource } from '../../../../../../common/data_sources';
import type { DataSourceProfileProviderParams, RootContext } from '../../../../profiles';
import { SolutionType } from '../../../../profiles';
import { createResolve } from './create_resolve';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../../consts';
import { RESOLUTION_MATCH } from '../__mocks__/logs_data_source_resolution_match';

describe('createResolve', () => {
  const OBSERVABILITY_CONTEXT: ContextWithProfileId<RootContext> = {
    profileId: OBSERVABILITY_ROOT_PROFILE_ID,
    solutionType: SolutionType.Observability,
  };
  const CLASSIC_CONTEXT: ContextWithProfileId<RootContext> = {
    profileId: 'classic-nav-root-profile',
    solutionType: SolutionType.Default,
  };
  const RESOLUTION_MISMATCH = { isMatch: false };
  const resolve = createResolve('valid', createProfileProviderSharedServicesMock().uiSettings);

  const buildParams = (
    rootContext: ContextWithProfileId<RootContext>,
    indexPattern: string,
    matchedIndices: string[] = []
  ): DataSourceProfileProviderParams => {
    const dataView = createStubIndexPattern({ spec: { title: indexPattern } });
    dataView.matchedIndices = matchedIndices;

    return {
      rootContext,
      dataSource: createEsqlDataSource(),
      query: { esql: `FROM ${indexPattern}` },
      dataView,
    };
  };

  // Matching is identical in Observability and Classic: the index pattern first, then the resolved
  // indices as a fallback.
  describe('matching', () => {
    it('matches when the index pattern matches', () => {
      expect(resolve(buildParams(OBSERVABILITY_CONTEXT, 'valid', ['ignored']))).toEqual(
        RESOLUTION_MATCH
      );
    });

    it('falls back to the resolved indices when the index pattern does not match', () => {
      expect(resolve(buildParams(OBSERVABILITY_CONTEXT, 'invalid', ['valid-default']))).toEqual(
        RESOLUTION_MATCH
      );
    });

    it('does not match when a resolved index does not belong to the integration', () => {
      expect(
        resolve(buildParams(OBSERVABILITY_CONTEXT, 'invalid', ['valid-default', 'invalid-default']))
      ).toEqual(RESOLUTION_MISMATCH);
    });

    it('does not match when neither the index pattern nor any resolved index matches', () => {
      expect(resolve(buildParams(OBSERVABILITY_CONTEXT, 'invalid', []))).toEqual(
        RESOLUTION_MISMATCH
      );
    });

    it('applies the same matching in Classic', () => {
      expect(resolve(buildParams(CLASSIC_CONTEXT, 'valid'))).toEqual(RESOLUTION_MATCH);
      expect(resolve(buildParams(CLASSIC_CONTEXT, 'invalid', ['valid-default']))).toEqual(
        RESOLUTION_MATCH
      );
      expect(resolve(buildParams(CLASSIC_CONTEXT, 'invalid', ['invalid-default']))).toEqual(
        RESOLUTION_MISMATCH
      );
    });
  });

  describe('Classic gating', () => {
    it('does not match when solution profiles are disabled', () => {
      const services = createProfileProviderSharedServicesMock();
      jest.spyOn(services.uiSettings, 'get').mockReturnValue(false);
      const disabledResolve = createResolve('valid', services.uiSettings);

      expect(disabledResolve(buildParams(CLASSIC_CONTEXT, 'valid'))).toEqual(RESOLUTION_MISMATCH);
    });

    it('does not match in Classic when the integration opts out, but still matches in Observability', () => {
      const classicDisabledResolve = createResolve(
        'valid',
        createProfileProviderSharedServicesMock().uiSettings,
        { enabledInClassicNav: false }
      );

      expect(classicDisabledResolve(buildParams(CLASSIC_CONTEXT, 'valid'))).toEqual(
        RESOLUTION_MISMATCH
      );
      expect(classicDisabledResolve(buildParams(OBSERVABILITY_CONTEXT, 'valid'))).toEqual(
        RESOLUTION_MATCH
      );
    });

    it('does not match in other solution views', () => {
      expect(
        resolve(buildParams({ profileId: 'root', solutionType: SolutionType.Search }, 'valid'))
      ).toEqual(RESOLUTION_MISMATCH);
      expect(
        resolve(buildParams({ profileId: 'root', solutionType: SolutionType.Security }, 'valid'))
      ).toEqual(RESOLUTION_MISMATCH);
    });
  });
});

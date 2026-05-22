/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionComponent } from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { createProfileProviderSharedServicesMock } from '../../../__mocks__';
import { SolutionType } from '../../../profiles';
import { ALERTS_INDEX_PATTERN, SECURITY_PROFILE_ID } from '../constants';
import { createSecurityRootProfileProvider } from './profile';

const MockComponent: FunctionComponent<DataGridCellValueElementProps> = () => null;

const createMockDataView = (indexPattern: string, ipFields: Array<{ name: string }> = []) => ({
  getIndexPattern: () => indexPattern,
  fields: { getByType: (type: string) => (type === 'ip' ? ipFields : []) },
});

const createProvider = (
  cellRendererFn?: (
    fieldName: string
  ) => FunctionComponent<DataGridCellValueElementProps> | undefined
) => {
  const services = createProfileProviderSharedServicesMock();
  jest.spyOn(services.discoverShared.features.registry, 'getById').mockReturnValue(
    cellRendererFn
      ? ({
          id: 'security-solution-cell-renderer',
          getRenderer: async () => cellRendererFn,
        } as ReturnType<typeof services.discoverShared.features.registry.getById>)
      : (undefined as ReturnType<typeof services.discoverShared.features.registry.getById>)
  );
  return createSecurityRootProfileProvider(services);
};

const resolveSecurityContext = async (
  cellRendererFn?: (
    fieldName: string
  ) => FunctionComponent<DataGridCellValueElementProps> | undefined
) => {
  const provider = createProvider(cellRendererFn);
  const result = await provider.resolve({ solutionNavId: SolutionType.Security });
  if (!result.isMatch) throw new Error('Expected isMatch to be true');
  return { provider, context: result.context };
};

describe('createSecurityRootProfileProvider', () => {
  it('should use the root security profile ID', () => {
    expect(createProvider().profileId).toBe(SECURITY_PROFILE_ID.root);
  });

  describe('resolve', () => {
    it('should not match for non-security solutions', async () => {
      const provider = createProvider();
      expect(await provider.resolve({ solutionNavId: SolutionType.Observability })).toEqual({
        isMatch: false,
      });
      expect(await provider.resolve({ solutionNavId: null })).toEqual({ isMatch: false });
    });

    it('should match for the security solution', async () => {
      const { context } = await resolveSecurityContext(() => MockComponent);
      expect(context.solutionType).toBe(SolutionType.Security);
      expect(context.getSecuritySolutionCellRenderer).toEqual(expect.any(Function));
    });

    it('should return undefined cell renderer when feature is not registered', async () => {
      const { context } = await resolveSecurityContext();
      expect(context.getSecuritySolutionCellRenderer).toBeUndefined();
    });
  });

  describe('getCellRenderers', () => {
    it('should return previous entries unchanged for non-alerts index patterns', async () => {
      const { provider, context } = await resolveSecurityContext(() => MockComponent);
      const getCellRenderers = provider.profile.getCellRenderers!(() => ({}), { context });
      const result = getCellRenderers({
        dataView: createMockDataView('logs-*'),
      } as Parameters<typeof getCellRenderers>[0]);
      expect(result).toEqual({});
    });

    it('should add workflow_status cell renderer for alerts index', async () => {
      const { provider, context } = await resolveSecurityContext((fieldName) =>
        fieldName === 'kibana.alert.workflow_status' ? MockComponent : undefined
      );
      const getCellRenderers = provider.profile.getCellRenderers!(() => ({}), { context });
      const result = getCellRenderers({
        dataView: createMockDataView(`${ALERTS_INDEX_PATTERN}default`),
      } as Parameters<typeof getCellRenderers>[0]);
      expect(result['kibana.alert.workflow_status']).toBeDefined();
    });

    it('should add cell renderers for IP fields without overriding existing ones', async () => {
      const ExistingRenderer: FunctionComponent<DataGridCellValueElementProps> = () => null;
      const { provider, context } = await resolveSecurityContext(() => MockComponent);
      const getCellRenderers = provider.profile.getCellRenderers!(
        () => ({ 'source.ip': ExistingRenderer }),
        { context }
      );
      const result = getCellRenderers({
        dataView: createMockDataView(`${ALERTS_INDEX_PATTERN}default`, [
          { name: 'source.ip' },
          { name: 'destination.ip' },
        ]),
      } as Parameters<typeof getCellRenderers>[0]);
      expect(result['source.ip']).toBe(ExistingRenderer);
      expect(result['destination.ip']).toBeDefined();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { discoverServiceMock } from '../../__mocks__/services';
import type { GetProfilesOptions } from '../profiles_manager';
import { createContextAwarenessMocks } from '../__mocks__';
import { useProfiles } from './use_profiles';
import type { CellRenderersExtensionParams } from '../types';
import type { AppliedProfile } from '../composable_profile';
import { SolutionType } from '../profiles';

const {
  rootProfileProviderMock,
  dataSourceProfileProviderMock,
  documentProfileProviderMock,
  rootProfileServiceMock,
  dataSourceProfileServiceMock,
  documentProfileServiceMock,
  contextRecordMock,
  contextRecordMock2,
  profilesManagerMock,
} = createContextAwarenessMocks({ shouldRegisterProviders: false });

rootProfileServiceMock.registerProvider({
  profileId: 'other-root-profile',
  profile: {},
  resolve: (params) => {
    if (params.solutionNavId === 'test') {
      return { isMatch: true, context: { solutionType: SolutionType.Default } };
    }

    return { isMatch: false };
  },
});

rootProfileServiceMock.registerProvider(rootProfileProviderMock);
dataSourceProfileServiceMock.registerProvider(dataSourceProfileProviderMock);
documentProfileServiceMock.registerProvider(documentProfileProviderMock);

const record = profilesManagerMock.resolveDocumentProfile({ record: contextRecordMock });
const record2 = profilesManagerMock.resolveDocumentProfile({ record: contextRecordMock2 });

discoverServiceMock.profilesManager = profilesManagerMock;

const getProfilesSpy = jest.spyOn(discoverServiceMock.profilesManager, 'getProfiles');
const getProfiles$Spy = jest.spyOn(discoverServiceMock.profilesManager, 'getProfiles$');

const render = () => {
  return renderHook((props) => useProfiles(props), {
    initialProps: { record } as React.PropsWithChildren<GetProfilesOptions>,
    wrapper: ({ children }) => (
      <KibanaContextProvider services={discoverServiceMock}>{children}</KibanaContextProvider>
    ),
  });
};

describe('useProfiles', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await profilesManagerMock.resolveRootProfile({});
    await profilesManagerMock.resolveDataSourceProfile({});
  });

  it('should return profiles', () => {
    const { result } = render();
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    expect(result.current).toHaveLength(3);
    const [rootProfile, dataSourceProfile, documentProfile] = result.current;
    const baseImpl = () => ({});
    rootProfile.getCellRenderers?.(baseImpl)({} as unknown as CellRenderersExtensionParams);
    expect(rootProfileProviderMock.profile.getCellRenderers).toHaveBeenCalledTimes(1);
    dataSourceProfile.getCellRenderers?.(baseImpl)({} as unknown as CellRenderersExtensionParams);
    expect(dataSourceProfileProviderMock.profile.getCellRenderers).toHaveBeenCalledTimes(1);
    documentProfile.getCellRenderers?.(baseImpl)({} as unknown as CellRenderersExtensionParams);
    expect(
      (documentProfileProviderMock.profile as AppliedProfile).getCellRenderers
    ).toHaveBeenCalledTimes(1);
  });

  it('should return the same array reference if profiles and record do not change', () => {
    const { result, rerender } = render();
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    const prevResult = result.current;
    rerender({ record });
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(prevResult);
  });

  it('should return a different array reference if record changes', () => {
    const { result, rerender } = render();
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    const prevResult = result.current;
    rerender({ record: record2 });
    expect(getProfilesSpy).toHaveBeenCalledTimes(3);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(2);
    expect(result.current).not.toBe(prevResult);
    expect(result.current[0]).toBe(prevResult[0]);
    expect(result.current[1]).toBe(prevResult[1]);
    expect(result.current[2]).not.toBe(prevResult[2]);
  });

  it('should return a different array reference if profiles change', async () => {
    const { result, rerender } = render();
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    const prevResult = result.current;
    rerender({ record });
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(prevResult);
    await act(async () => {
      await profilesManagerMock.resolveRootProfile({ solutionNavId: 'test' });
    });
    rerender({ record });
    expect(getProfilesSpy).toHaveBeenCalledTimes(3);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    expect(result.current).not.toBe(prevResult);
    expect(result.current[0]).not.toBe(prevResult[0]);
    expect(result.current[1]).toBe(prevResult[1]);
    expect(result.current[2]).not.toBe(prevResult[2]);
  });
});

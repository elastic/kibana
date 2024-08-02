/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { discoverServiceMock } from '../../__mocks__/services';
import { GetProfilesOptions } from '../profiles_manager';
import { createContextAwarenessMocks } from '../__mocks__';
import { useProfiles } from './use_profiles';

const {
  rootProfileProviderMock,
  dataSourceProfileProviderMock,
  documentProfileProviderMock,
  contextRecordMock,
  contextRecordMock2,
  profilesManagerMock,
} = createContextAwarenessMocks();

profilesManagerMock.resolveRootProfile({});
profilesManagerMock.resolveDataSourceProfile({});

const record = profilesManagerMock.resolveDocumentProfile({ record: contextRecordMock });
const record2 = profilesManagerMock.resolveDocumentProfile({ record: contextRecordMock2 });

discoverServiceMock.profilesManager = profilesManagerMock;

const getProfilesSpy = jest.spyOn(discoverServiceMock.profilesManager, 'getProfiles');
const getProfiles$Spy = jest.spyOn(discoverServiceMock.profilesManager, 'getProfiles$');

const render = () => {
  return renderHook((props) => useProfiles(props), {
    initialProps: { record } as GetProfilesOptions,
    wrapper: ({ children }) => (
      <KibanaContextProvider services={discoverServiceMock}>{children}</KibanaContextProvider>
    ),
  });
};

describe('useProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return profiles', () => {
    const { result } = render();
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual([
      rootProfileProviderMock.profile,
      dataSourceProfileProviderMock.profile,
      documentProfileProviderMock.profile,
    ]);
  });

  it('should return the same array reference if profiles do not change', () => {
    const { result, rerender } = render();
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    const prevResult = result.current;
    rerender({ record });
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(prevResult);
    rerender({ record: record2 });
    expect(getProfilesSpy).toHaveBeenCalledTimes(3);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(2);
    expect(result.current).toBe(prevResult);
  });

  it('should return a different array reference if profiles change', () => {
    const { result, rerender } = render();
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    const prevResult = result.current;
    rerender({ record });
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(prevResult);
    rerender({ record: undefined });
    expect(getProfilesSpy).toHaveBeenCalledTimes(3);
    expect(getProfiles$Spy).toHaveBeenCalledTimes(2);
    expect(result.current).not.toBe(prevResult);
  });
});

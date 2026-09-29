/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { DiscoverServices } from '../../build_services';
import {
  DiscoverContainerInternal,
  type DiscoverContainerInternalProps,
} from './discover_container';
import { discoverServiceMock } from '../../__mocks__/services';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

const mockOverrideService = {};
const getDiscoverServicesMock = vi.fn(() => discoverServiceMock);

vi.mock('../../application/main', () => {
  return {
    DiscoverMainRoute: () => <></>,
  };
});

vi.mock('@kbn/kibana-react-plugin/public');

const { getScopedHistory } = discoverServiceMock;

const customizeMock = vi.fn();

const TestComponent = (props: Partial<DiscoverContainerInternalProps>) => {
  return (
    <DiscoverContainerInternal
      overrideServices={props.overrideServices ?? mockOverrideService}
      customizationCallbacks={props.customizationCallbacks ?? [customizeMock]}
      scopedHistory={props.scopedHistory ?? getScopedHistory()!}
      getDiscoverServices={() => Promise.resolve(getDiscoverServicesMock())}
    />
  );
};

const TEST_IDS = {
  DISCOVER_CONTAINER_INTERNAL: 'discover-container-internal-wrapper',
};

describe('DiscoverContainerInternal should render properly', () => {
  beforeAll(() => {
    (KibanaContextProvider as Mock).mockImplementation(() => <></>);
  });

  afterEach(() => vi.clearAllMocks());

  it('should render', async () => {
    const { getByTestId } = render(<TestComponent />);

    expect(getDiscoverServicesMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(getByTestId(TEST_IDS.DISCOVER_CONTAINER_INTERNAL)).toBeInTheDocument();
    });
  });

  it('should render with overrideServices', async () => {
    const overrideServices: Partial<DiscoverServices> = {
      data: {
        ...dataPluginMock.createStartContract(),
        // @ts-expect-error
        _name: 'custom',
      },
    };
    render(<TestComponent overrideServices={overrideServices} />);

    await waitFor(() => {
      expect(KibanaContextProvider as Mock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          services: expect.objectContaining({
            data: expect.objectContaining({
              _name: 'custom',
            }),
          }),
        }),
        {}
      );
    });
  });
});

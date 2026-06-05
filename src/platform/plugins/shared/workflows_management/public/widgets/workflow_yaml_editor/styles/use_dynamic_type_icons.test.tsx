/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { useDynamicTypeIcons } from './use_dynamic_type_icons';
import type { ConnectorsResponse } from '../../../entities/connectors/model/types';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { getIconBase64 } from '../../../shared/ui/step_icons/get_icon_base64';

jest.mock('../../../shared/ui/step_icons/get_icon_base64', () => ({
  getIconBase64: jest.fn().mockResolvedValue('data:image/png;base64,xx'),
  getTriggerBoltFallbackDataUrl: jest.fn().mockReturnValue('data:image/png;base64,bolt'),
}));

function connectorTypeStub(actionTypeId: string): ConnectorTypeInfo {
  return {
    actionTypeId,
    displayName: actionTypeId,
    instances: [],
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    subActions: [],
  };
}

describe('useDynamicTypeIcons', () => {
  it('does not call actionTypeRegistry.get for connector types missing from the UI registry', async () => {
    const registeredId = '.registered';
    const unregisteredId = '.notInRegistry';

    const has = jest.fn((id: string) => id === registeredId);
    const get = jest.fn((id: string) => {
      if (id !== registeredId) {
        throw new Error(`get() must not be called for unregistered id: ${id}`);
      }
      return { iconClass: 'plugs' as const };
    });

    const services = createStartServicesMock();
    services.triggersActionsUi = {
      ...services.triggersActionsUi,
      actionTypeRegistry: {
        has,
        get,
      } as unknown as typeof services.triggersActionsUi.actionTypeRegistry,
    };

    const connectorsData: ConnectorsResponse = {
      totalConnectors: 0,
      connectorTypes: {
        [registeredId]: connectorTypeStub(registeredId),
        [unregisteredId]: connectorTypeStub(unregisteredId),
      },
    };

    const { unmount } = renderHook(() => useDynamicTypeIcons(connectorsData, undefined, true), {
      wrapper: getTestProvider({ services }),
    });

    await waitFor(() => {
      expect(get).toHaveBeenCalledTimes(1);
    });

    expect(get).toHaveBeenCalledWith(registeredId);
    expect(has).toHaveBeenCalledWith(unregisteredId);

    unmount();
  });

  it('injects inline icon CSS for connector v2 base types', async () => {
    const services = createStartServicesMock();
    const connectorsData: ConnectorsResponse = {
      totalConnectors: 0,
      connectorTypes: {
        '.notion': connectorTypeStub('.notion'),
        '.sharepoint-server': connectorTypeStub('.sharepoint-server'),
      },
    };
    const onShadowIconsCssReady = jest.fn();

    const { unmount } = renderHook(
      () => useDynamicTypeIcons(connectorsData, undefined, true, undefined, onShadowIconsCssReady),
      {
        wrapper: getTestProvider({ services }),
      }
    );

    await waitFor(() => {
      expect(onShadowIconsCssReady).toHaveBeenCalled();
    });

    const css = onShadowIconsCssReady.mock.calls.at(-1)?.[0] ?? '';
    expect(css).toContain('.type-inline-highlight.type-notion::after');
    expect(css).toContain('.type-inline-highlight.type-sharepoint-server::after');
    expect(getIconBase64).toHaveBeenCalledWith(
      expect.objectContaining({ actionTypeId: '.notion', kind: 'step' })
    );
    expect(getIconBase64).toHaveBeenCalledWith(
      expect.objectContaining({ actionTypeId: '.sharepoint-server', kind: 'step' })
    );

    unmount();
  });
});

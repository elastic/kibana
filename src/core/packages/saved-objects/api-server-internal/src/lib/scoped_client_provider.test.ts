/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Optional } from 'utility-types';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import { SavedObjectsClientProvider } from './scoped_client_provider';
import {
  type ISavedObjectTypeRegistry,
  type SavedObjectsClientFactory,
  type SavedObjectsEncryptionExtensionFactory,
  type SavedObjectsSecurityExtensionFactory,
  type SavedObjectsSpacesExtensionFactory,
  type SavedObjectsOlsExtensionFactory,
  OLS_EXTENSION_ID,
  ENCRYPTION_EXTENSION_ID,
  SECURITY_EXTENSION_ID,
  SPACES_EXTENSION_ID,
} from '@kbn/core-saved-objects-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { savedObjectsExtensionsMock } from '../mocks/saved_objects_extensions.mock';

/**
 * @internal only used for unit tests
 */
interface Params {
  defaultClientFactory: SavedObjectsClientFactory;
  typeRegistry: ISavedObjectTypeRegistry;
  encryptionExtensionFactory: SavedObjectsEncryptionExtensionFactory;
  securityExtensionFactory: SavedObjectsSecurityExtensionFactory;
  spacesExtensionFactory: SavedObjectsSpacesExtensionFactory;
  olsExtensionFactory: SavedObjectsOlsExtensionFactory;
}

function createClientProvider(
  params: Optional<
    Params,
    | 'encryptionExtensionFactory'
    | 'securityExtensionFactory'
    | 'spacesExtensionFactory'
    | 'olsExtensionFactory'
  >
) {
  return new SavedObjectsClientProvider({
    encryptionExtensionFactory: undefined,
    securityExtensionFactory: undefined,
    spacesExtensionFactory: undefined,
    ...params,
  });
}

test(`uses default client factory when one isn't set`, () => {
  const returnValue = Symbol();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(returnValue);
  const request = httpServerMock.createKibanaRequest();

  const clientProvider = createClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
    typeRegistry: typeRegistryMock.create(),
  });
  const result = clientProvider.getClient(request);

  expect(result).toBe(returnValue);
  expect(defaultClientFactoryMock).toHaveBeenCalledTimes(1);
  expect(defaultClientFactoryMock).toHaveBeenCalledWith({
    extensions: expect.any(Object),
    request,
  });
});

test(`uses custom client factory when one is set`, () => {
  const defaultClientFactoryMock = jest.fn();
  const request = httpServerMock.createKibanaRequest();
  const returnValue = Symbol();
  const customClientFactoryMock = jest.fn().mockReturnValue(returnValue);

  const clientProvider = createClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
    typeRegistry: typeRegistryMock.create(),
  });
  clientProvider.setClientFactory(customClientFactoryMock);
  const result = clientProvider.getClient(request);

  expect(result).toBe(returnValue);
  expect(defaultClientFactoryMock).not.toHaveBeenCalled();
  expect(customClientFactoryMock).toHaveBeenCalledTimes(1);
  expect(customClientFactoryMock).toHaveBeenCalledWith({
    extensions: expect.any(Object),
    request,
  });
});

test(`throws error when more than one scoped saved objects client factory is set`, () => {
  const defaultClientFactory = jest.fn();
  const clientFactory = jest.fn();

  const clientProvider = createClientProvider({
    defaultClientFactory,
    typeRegistry: typeRegistryMock.create(),
  });

  clientProvider.setClientFactory(clientFactory);
  expect(() => {
    clientProvider.setClientFactory(clientFactory);
  }).toThrowErrorMatchingInlineSnapshot(
    `"custom client factory is already set, unable to replace the current one"`
  );
});

describe(`allows extensions to be excluded`, () => {
  const defaultClient = Symbol();
  const typeRegistry = typeRegistryMock.create();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(defaultClient);

  const mockEncryptionExt = savedObjectsExtensionsMock.createEncryptionExtension();
  const encryptionExtFactory: SavedObjectsEncryptionExtensionFactory = (params: {
    typeRegistry: ISavedObjectTypeRegistry;
    request: KibanaRequest;
  }) => mockEncryptionExt;

  const mockSpacesExt = savedObjectsExtensionsMock.createSpacesExtension();
  const spacesExtFactory: SavedObjectsSpacesExtensionFactory = (params: {
    typeRegistry: ISavedObjectTypeRegistry;
    request: KibanaRequest;
  }) => mockSpacesExt;

  const mockSecurityExt = savedObjectsExtensionsMock.createSecurityExtension();
  const securityExtFactory: SavedObjectsSecurityExtensionFactory = (params: {
    typeRegistry: ISavedObjectTypeRegistry;
    request: KibanaRequest;
  }) => mockSecurityExt;

  const clientProvider = createClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
    encryptionExtensionFactory: encryptionExtFactory,
    spacesExtensionFactory: spacesExtFactory,
    securityExtensionFactory: securityExtFactory,
    typeRegistry,
  });

  test(`calls client factory with all extensions excluded`, async () => {
    const request = httpServerMock.createKibanaRequest();

    clientProvider.getClient(request, {
      excludedExtensions: [ENCRYPTION_EXTENSION_ID, SECURITY_EXTENSION_ID, SPACES_EXTENSION_ID],
    });

    expect(defaultClientFactoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: {
          encryptionExtension: undefined,
          securityExtension: undefined,
          spacesExtension: undefined,
          olsExtension: expect.any(Object),
        },
      })
    );
  });

  test(`calls client factory with some extensions excluded`, async () => {
    const request = httpServerMock.createKibanaRequest();

    clientProvider.getClient(request, {
      excludedExtensions: [ENCRYPTION_EXTENSION_ID, SPACES_EXTENSION_ID],
    });

    expect(defaultClientFactoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: {
          encryptionExtension: undefined,
          securityExtension: mockSecurityExt,
          spacesExtension: undefined,
          olsExtension: expect.any(Object),
        },
      })
    );
  });

  test(`calls client factory with one extension excluded`, async () => {
    const request = httpServerMock.createKibanaRequest();

    clientProvider.getClient(request, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });

    expect(defaultClientFactoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: {
          encryptionExtension: mockEncryptionExt,
          securityExtension: undefined,
          spacesExtension: mockSpacesExt,
          olsExtension: expect.any(Object),
        },
      })
    );
  });

  test(`calls client factory with no extensions excluded`, async () => {
    const request = httpServerMock.createKibanaRequest();

    clientProvider.getClient(request, {
      excludedExtensions: [],
    });

    expect(defaultClientFactoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: {
          encryptionExtension: mockEncryptionExt,
          securityExtension: mockSecurityExt,
          spacesExtension: mockSpacesExt,
          olsExtension: expect.any(Object),
        },
      })
    );
  });
});

test(`allows hidden typed to be included`, () => {
  const defaultClient = Symbol();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(defaultClient);
  const clientProvider = createClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
    typeRegistry: typeRegistryMock.create(),
  });
  const request = httpServerMock.createKibanaRequest();

  const actualClient = clientProvider.getClient(request, {
    includedHiddenTypes: ['task'],
  });

  expect(actualClient).toBe(defaultClient);
  expect(defaultClientFactoryMock).toHaveBeenCalledWith({
    extensions: expect.any(Object),
    request,
    includedHiddenTypes: ['task'],
  });
});

describe('OLS extension', () => {
  const typeRegistry = typeRegistryMock.create();

  test('stays attached when the security extension is excluded', () => {
    const mockOlsExt = savedObjectsExtensionsMock.createOlsExtension();
    const defaultClientFactoryMock = jest.fn();
    const clientProvider = createClientProvider({
      defaultClientFactory: defaultClientFactoryMock,
      securityExtensionFactory: () => savedObjectsExtensionsMock.createSecurityExtension(),
      olsExtensionFactory: () => mockOlsExt,
      typeRegistry,
    });

    clientProvider.getClient(httpServerMock.createKibanaRequest(), {
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });

    expect(defaultClientFactoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: expect.objectContaining({
          securityExtension: undefined,
          olsExtension: mockOlsExt,
        }),
      })
    );
  });

  test('passes a disabled extension through, and gives the factory the type registry and request', () => {
    const disabledOlsExt = { ...savedObjectsExtensionsMock.createOlsExtension(), enabled: false };
    const olsExtensionFactory = jest.fn().mockReturnValue(disabledOlsExt);
    const defaultClientFactoryMock = jest.fn();
    const clientProvider = createClientProvider({
      defaultClientFactory: defaultClientFactoryMock,
      olsExtensionFactory,
      typeRegistry,
    });
    const request = httpServerMock.createKibanaRequest();

    clientProvider.getClient(request);

    expect(olsExtensionFactory).toHaveBeenCalledWith({ typeRegistry, request });
    expect(defaultClientFactoryMock.mock.calls[0][0].extensions.olsExtension).toBe(disabledOlsExt);
  });

  test('shares one fail-closed extension across requests', () => {
    const defaultClientFactoryMock = jest.fn();
    const clientProvider = createClientProvider({
      defaultClientFactory: defaultClientFactoryMock,
      typeRegistry,
    });

    clientProvider.getClient(httpServerMock.createKibanaRequest());
    clientProvider.getClient(httpServerMock.createKibanaRequest());

    const [[first], [second]] = defaultClientFactoryMock.mock.calls;
    expect(first.extensions.olsExtension).toBe(second.extensions.olsExtension);
  });

  test('cannot be excluded', () => {
    const defaultClientFactoryMock = jest.fn();
    const clientProvider = createClientProvider({
      defaultClientFactory: defaultClientFactoryMock,
      typeRegistry,
    });

    expect(() =>
      clientProvider.getClient(httpServerMock.createKibanaRequest(), {
        excludedExtensions: [OLS_EXTENSION_ID],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"The \\"ols\\" saved objects extension cannot be excluded"`
    );
    expect(defaultClientFactoryMock).not.toHaveBeenCalled();
  });

  test.each([
    ['there is no factory', undefined],
    ['the factory returns nothing', () => undefined],
  ])('fails closed when %s', async (_, olsExtensionFactory) => {
    const defaultClientFactoryMock = jest.fn();
    const clientProvider = createClientProvider({
      defaultClientFactory: defaultClientFactoryMock,
      olsExtensionFactory,
      typeRegistry,
    });
    clientProvider.getClient(httpServerMock.createKibanaRequest());

    const { olsExtension } = defaultClientFactoryMock.mock.calls[0][0].extensions;
    expect(olsExtension.enabled).toBe(true);
    await expect(
      olsExtension.authorizeAclChange({ type: 'action', id: '1', change: { kind: 'claim' } })
    ).rejects.toThrow('Object-level security (OLS) is unavailable for this request');
  });
});

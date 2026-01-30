/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FieldDescription } from './field_description';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { SHOULD_TRUNCATE_FIELD_DESCRIPTION_LOCALSTORAGE_KEY } from './field_description';

const mockSetLocalStorage = jest.fn();
const mockLocalStorageKey = SHOULD_TRUNCATE_FIELD_DESCRIPTION_LOCALSTORAGE_KEY;
let mockTestInitialLocalStorageValue: boolean | undefined;

jest.mock('react-use/lib/useLocalStorage', () => {
  return jest.fn((key: string, initialValue: number) => {
    if (key !== mockLocalStorageKey) {
      throw new Error(`Unexpected key: ${key}`);
    }
    return [mockTestInitialLocalStorageValue ?? initialValue, mockSetLocalStorage];
  });
});

describe('FieldDescription', () => {
  afterEach(() => {
    mockSetLocalStorage.mockReset();
    mockTestInitialLocalStorageValue = undefined;
  });

  it('should render correctly when no custom description', async () => {
    render(<FieldDescription field={{ name: 'bytes', type: 'number' }} />);
    const desc = screen.queryByTestId('fieldDescription-bytes');
    expect(desc).toBeNull();
  });

  it('should render correctly with a short custom description', async () => {
    const customDescription = 'test this desc';
    render(<FieldDescription field={{ name: 'bytes', type: 'number', customDescription }} />);
    const desc = screen.queryByTestId('fieldDescription-bytes');
    expect(desc).toHaveTextContent(customDescription);
    const button = screen.queryByTestId('toggleFieldDescription-bytes');
    expect(button).toBeNull();
  });

  it('should render correctly with a long custom description', async () => {
    const customDescription = 'test this long desc '.repeat(8).trim();
    render(<FieldDescription field={{ name: 'bytes', type: 'number', customDescription }} />);
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(customDescription);

    await userEvent.click(screen.getByTestId('toggleFieldDescription-bytes'));

    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(
      `${customDescription}View less`
    );
    expect(mockSetLocalStorage).toHaveBeenCalledWith(false);

    await userEvent.click(screen.getByTestId('toggleFieldDescription-bytes'));

    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(customDescription);
    expect(mockSetLocalStorage).toHaveBeenCalledWith(true);
  });

  it('should render correctly with a long custom description and do not truncate it by default as per local storage', async () => {
    mockTestInitialLocalStorageValue = false;
    const customDescription = 'test this long desc '.repeat(8).trim();
    render(<FieldDescription field={{ name: 'bytes', type: 'number', customDescription }} />);
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(
      `${customDescription}View less`
    );
    expect(mockSetLocalStorage).not.toHaveBeenCalled();
    screen.queryByTestId('toggleFieldDescription-bytes')?.click();
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(customDescription);
    expect(mockSetLocalStorage).toHaveBeenCalledWith(true);
  });

  it('should render a long custom description without truncation', async () => {
    const customDescription = 'test this long desc '.repeat(8).trim();
    render(
      <FieldDescription
        field={{ name: 'bytes', type: 'number', customDescription }}
        truncate={false}
      />
    );
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(customDescription);
    const button = screen.queryByTestId('toggleFieldDescription-bytes');
    expect(button).toBeNull();
  });

  it('should render correctly with markdown', async () => {
    const fieldsMetadataService: Partial<FieldsMetadataPublicStart> = {
      useFieldsMetadata: jest.fn(() => ({
        fieldsMetadata: {
          bytes: { description: 'ESC desc', type: 'long' },
        },
        loading: false,
        error: undefined,
        reload: jest.fn(),
      })),
    };
    const customDescription = 'test this `markdown` desc';
    render(
      <FieldDescription
        field={{ name: 'bytes', type: 'number', customDescription }}
        fieldsMetadataService={fieldsMetadataService as FieldsMetadataPublicStart}
      />
    );
    const desc = screen.queryByTestId('fieldDescription-bytes');
    expect(desc).toHaveTextContent('test this markdown desc');
    expect(fieldsMetadataService.useFieldsMetadata).not.toHaveBeenCalled();
  });

  it('should fetch ECS metadata', async () => {
    const mockUseFieldsMetadata = jest.fn();
    // First call: stream-specific metadata (no streamName, so empty params)
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {},
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });
    // Second call: ECS metadata
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {
        bytes: { description: 'ESC desc', type: 'long' },
      },
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });

    const fieldsMetadataService: Partial<FieldsMetadataPublicStart> = {
      useFieldsMetadata: mockUseFieldsMetadata,
    };
    render(
      <FieldDescription
        field={{ name: 'bytes', type: 'number', customDescription: undefined }}
        fieldsMetadataService={fieldsMetadataService as FieldsMetadataPublicStart}
      />
    );
    const desc = screen.queryByTestId('fieldDescription-bytes');
    expect(desc).toHaveTextContent('ESC desc');
    // First call with empty params (no streamName provided)
    expect(mockUseFieldsMetadata).toHaveBeenCalledWith({
      attributes: [],
      fieldNames: [],
    });
    // Second call for ECS metadata
    expect(mockUseFieldsMetadata).toHaveBeenCalledWith({
      attributes: ['description', 'type'],
      fieldNames: ['bytes'],
    });
  });

  it('should show stream-specific description when streamName is provided (stream-only case)', async () => {
    const mockUseFieldsMetadata = jest.fn();
    // First call: stream-specific metadata (with streamName)
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {
        message: { description: 'Stream-specific description', type: 'keyword' },
      },
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });
    // Second call: ECS metadata (without streamName) - no description
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {},
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });

    const fieldsMetadataService: Partial<FieldsMetadataPublicStart> = {
      useFieldsMetadata: mockUseFieldsMetadata,
    };
    render(
      <FieldDescription
        field={{ name: 'message', type: 'string', customDescription: undefined }}
        fieldsMetadataService={fieldsMetadataService as FieldsMetadataPublicStart}
        streamName="logs.nginx"
      />
    );
    const desc = screen.queryByTestId('fieldDescription-message');
    expect(desc).toHaveTextContent('Stream-specific description');
    expect(mockUseFieldsMetadata).toHaveBeenCalledWith({
      attributes: ['description', 'type'],
      fieldNames: ['message'],
      streamName: 'logs.nginx',
    });
    expect(mockUseFieldsMetadata).toHaveBeenCalledWith({
      attributes: ['description', 'type'],
      fieldNames: ['message'],
    });
  });

  it('should merge stream and ECS descriptions when both exist', async () => {
    const mockUseFieldsMetadata = jest.fn();
    // First call: stream-specific metadata (with streamName)
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {
        message: { description: 'Stream-specific description', type: 'keyword' },
      },
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });
    // Second call: ECS metadata (without streamName)
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {
        message: { description: 'ECS/OTel description', type: 'keyword' },
      },
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });

    const fieldsMetadataService: Partial<FieldsMetadataPublicStart> = {
      useFieldsMetadata: mockUseFieldsMetadata,
    };
    render(
      <FieldDescription
        field={{ name: 'message', type: 'string', customDescription: undefined }}
        fieldsMetadataService={fieldsMetadataService as FieldsMetadataPublicStart}
        streamName="logs.nginx"
      />
    );
    const desc = screen.queryByTestId('fieldDescription-message');
    expect(desc).toHaveTextContent('Stream description:');
    expect(desc).toHaveTextContent('Stream-specific description');
    expect(desc).toHaveTextContent('ECS/OTel description:');
    expect(desc).toHaveTextContent('ECS/OTel description');
  });

  it('should not merge descriptions if they are identical', async () => {
    const mockUseFieldsMetadata = jest.fn();
    // First call: stream-specific metadata (with streamName)
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {
        message: { description: 'Same description', type: 'keyword' },
      },
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });
    // Second call: ECS metadata (without streamName) - same description
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {
        message: { description: 'Same description', type: 'keyword' },
      },
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });

    const fieldsMetadataService: Partial<FieldsMetadataPublicStart> = {
      useFieldsMetadata: mockUseFieldsMetadata,
    };
    render(
      <FieldDescription
        field={{ name: 'message', type: 'string', customDescription: undefined }}
        fieldsMetadataService={fieldsMetadataService as FieldsMetadataPublicStart}
        streamName="logs.nginx"
      />
    );
    const desc = screen.queryByTestId('fieldDescription-message');
    expect(desc).toHaveTextContent('Same description');
    // Should NOT contain merge headers when descriptions are identical
    expect(desc).not.toHaveTextContent('Stream description:');
    expect(desc).not.toHaveTextContent('ECS/OTel description:');
  });

  it('should not show ECS metadata if types do not match', async () => {
    const mockUseFieldsMetadata = jest.fn();
    // First call: stream-specific metadata (no streamName, so empty params)
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {},
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });
    // Second call: ECS metadata with mismatched type
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {
        bytes: { description: 'ESC desc', type: 'keyword' },
      },
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });

    const fieldsMetadataService: Partial<FieldsMetadataPublicStart> = {
      useFieldsMetadata: mockUseFieldsMetadata,
    };
    render(
      <FieldDescription
        field={{ name: 'bytes', type: 'number', customDescription: undefined }}
        fieldsMetadataService={fieldsMetadataService as FieldsMetadataPublicStart}
      />
    );
    const desc = screen.queryByTestId('fieldDescription-bytes');
    expect(desc).toBeNull();
  });

  it('should not show ECS metadata if none found', async () => {
    const mockUseFieldsMetadata = jest.fn();
    // First call: stream-specific metadata (no streamName, so empty params)
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {},
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });
    // Second call: ECS metadata - none found
    mockUseFieldsMetadata.mockReturnValueOnce({
      fieldsMetadata: {},
      loading: false,
      error: undefined,
      reload: jest.fn(),
    });

    const fieldsMetadataService: Partial<FieldsMetadataPublicStart> = {
      useFieldsMetadata: mockUseFieldsMetadata,
    };
    render(
      <FieldDescription
        field={{ name: 'extension.keyword', type: 'keyword', customDescription: undefined }}
        fieldsMetadataService={fieldsMetadataService as FieldsMetadataPublicStart}
      />
    );
    const desc = screen.queryByTestId('fieldDescription-extension.keyword');
    expect(desc).toBeNull();
    // First call with empty params (no streamName provided)
    expect(mockUseFieldsMetadata).toHaveBeenCalledWith({
      attributes: [],
      fieldNames: [],
    });
    // Second call for ECS metadata
    expect(mockUseFieldsMetadata).toHaveBeenCalledWith({
      attributes: ['description', 'type'],
      fieldNames: ['extension'],
    });
  });
});

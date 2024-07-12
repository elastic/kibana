/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FieldDescription } from './field_description';
import { render, screen } from '@testing-library/react';
import { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';

describe('FieldDescription', () => {
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
    screen.queryByTestId('toggleFieldDescription-bytes')?.click();
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(
      `${customDescription}View less`
    );
    screen.queryByTestId('toggleFieldDescription-bytes')?.click();
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(customDescription);
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
    render(
      <FieldDescription
        field={{ name: 'bytes', type: 'number', customDescription: undefined }}
        fieldsMetadataService={fieldsMetadataService as FieldsMetadataPublicStart}
      />
    );
    const desc = screen.queryByTestId('fieldDescription-bytes');
    expect(desc).toHaveTextContent('ESC desc');
    expect(fieldsMetadataService.useFieldsMetadata).toHaveBeenCalledWith({
      attributes: ['description', 'type'],
      fieldNames: ['bytes'],
    });
  });

  it('should not show ECS metadata if types do not match', async () => {
    const fieldsMetadataService: Partial<FieldsMetadataPublicStart> = {
      useFieldsMetadata: jest.fn(() => ({
        fieldsMetadata: {
          bytes: { description: 'ESC desc', type: 'keyword' },
        },
        loading: false,
        error: undefined,
        reload: jest.fn(),
      })),
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
    const fieldsMetadataService: Partial<FieldsMetadataPublicStart> = {
      useFieldsMetadata: jest.fn(() => ({
        fieldsMetadata: {},
        loading: false,
        error: undefined,
        reload: jest.fn(),
      })),
    };
    render(
      <FieldDescription
        field={{ name: 'extension.keyword', type: 'keyword', customDescription: undefined }}
        fieldsMetadataService={fieldsMetadataService as FieldsMetadataPublicStart}
      />
    );
    const desc = screen.queryByTestId('fieldDescription-extension.keyword');
    expect(desc).toBeNull();
    expect(fieldsMetadataService.useFieldsMetadata).toHaveBeenCalledWith({
      attributes: ['description', 'type'],
      fieldNames: ['extension'],
    });
  });
});

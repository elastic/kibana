/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { IndexEditorIndexMode } from '../types';
import { EmptyPrompt } from './empty_prompt';

jest.mock('@kbn/kibana-react-plugin/public');

const mockUseKibana = useKibana as jest.Mock;

const renderEmptyPrompt = ({
  indexMode,
  userCanResetIndex = true,
  isIndexCreated = true,
  columns = [{ id: 'field1', name: 'field1', meta: { type: 'string' } }],
}: {
  indexMode: IndexEditorIndexMode;
  userCanResetIndex?: boolean;
  isIndexCreated?: boolean;
  columns?: DatatableColumn[];
}) => {
  const indexUpdateService = {
    indexMode,
    userCanResetIndex,
    isIndexCreated: () => isIndexCreated,
    dataTableColumns$: new BehaviorSubject<DatatableColumn[]>(columns),
    resetIndexMapping: jest.fn(),
  };

  mockUseKibana.mockReturnValue({
    services: {
      indexUpdateService,
      fileUpload: { getMaxBytesFormatted: () => '100 MB' },
      notifications: { toasts: { addError: jest.fn() } },
      indexEditorTelemetryService: { trackResetIndex: jest.fn() },
    },
  });

  return render(
    <I18nProvider>
      <EmptyPrompt />
    </I18nProvider>
  );
};

describe('EmptyPrompt', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the "Reset index" action for a lookup index', () => {
    renderEmptyPrompt({ indexMode: 'lookup' });

    expect(screen.getByRole('button', { name: /reset index/i })).toBeVisible();
  });

  it('hides the "Reset index" action for a standard index', () => {
    renderEmptyPrompt({ indexMode: 'standard' });

    expect(screen.queryByRole('button', { name: /reset index/i })).not.toBeInTheDocument();
  });
});

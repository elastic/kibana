/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { DataSourceSelectionChange } from '@kbn/esql-resource-browser';
import type { monaco } from '@kbn/code-editor';
import { useDataSourceBrowser } from './use_data_source_browser';
import {
  ViewSelectedSource,
  type ESQLEditorTelemetryService,
} from '../telemetry/telemetry_service';

const QUERY = 'FROM logs-*';

const createTelemetryService = () =>
  ({
    trackResourceBrowserOpened: jest.fn(),
    trackResourceBrowserItemToggled: jest.fn(),
    trackViewSelected: jest.fn(),
  } as unknown as jest.Mocked<ESQLEditorTelemetryService>);

const renderDataSourceBrowser = async (telemetryService: ESQLEditorTelemetryService) => {
  const model = {
    getValue: () => QUERY,
    getOffsetAt: () => QUERY.length,
    getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
  } as unknown as monaco.editor.ITextModel;

  const editor = {
    getPosition: () => ({ lineNumber: 1, column: QUERY.length + 1 }),
    getDomNode: () => null,
    getScrolledVisiblePosition: () => null,
    executeEdits: jest.fn(),
  } as unknown as monaco.editor.IStandaloneCodeEditor;

  const { result } = renderHook(() =>
    useDataSourceBrowser({
      editorRef: { current: editor },
      editorModel: { current: model },
      telemetryService,
    })
  );

  await act(async () => {
    await result.current.openIndicesBrowser();
  });

  return result;
};

describe('useDataSourceBrowser', () => {
  it('reports a view selection when a view is added', async () => {
    const telemetryService = createTelemetryService();
    const result = await renderDataSourceBrowser(telemetryService);

    act(() => {
      result.current.handleDataSourceBrowserSelect('errors_view', DataSourceSelectionChange.Add, {
        isView: true,
      });
    });

    expect(telemetryService.trackViewSelected).toHaveBeenCalledTimes(1);
    expect(telemetryService.trackViewSelected).toHaveBeenCalledWith({
      source: ViewSelectedSource.RESOURCE_BROWSER,
    });
  });

  it('does not report a view selection for sources that are not views', async () => {
    const telemetryService = createTelemetryService();
    const result = await renderDataSourceBrowser(telemetryService);

    act(() => {
      result.current.handleDataSourceBrowserSelect('logs-2024', DataSourceSelectionChange.Add, {
        isView: false,
      });
    });

    expect(telemetryService.trackViewSelected).not.toHaveBeenCalled();
  });

  it('does not report a view selection when a view is deselected', async () => {
    const telemetryService = createTelemetryService();
    const result = await renderDataSourceBrowser(telemetryService);

    act(() => {
      result.current.handleDataSourceBrowserSelect('errors_view', DataSourceSelectionChange.Add, {
        isView: true,
      });
    });
    telemetryService.trackViewSelected.mockClear();

    act(() => {
      result.current.handleDataSourceBrowserSelect(
        'errors_view',
        DataSourceSelectionChange.Remove,
        { isView: true }
      );
    });

    expect(telemetryService.trackViewSelected).not.toHaveBeenCalled();
  });
});

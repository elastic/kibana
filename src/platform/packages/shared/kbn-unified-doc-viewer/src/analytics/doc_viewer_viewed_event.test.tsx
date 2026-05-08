/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DOC_VIEWER_VIEWED_EVENT_TYPE, DOC_VIEWER_VIEWED_ROOT_CONTENT_ID } from './constants';
import { useDocViewerTabViewedEvent, useDocViewerViewedEvent } from './doc_viewer_viewed_event';

const createReportEvent = () => analyticsServiceMock.createAnalyticsServiceStart().reportEvent;

const createHit = (id: string) =>
  buildDataTableRecord(
    {
      _id: id,
      _index: 'test-index',
    },
    dataViewMock
  );

describe('useDocViewerViewedEvent', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('reports an event on mount and when the event key changes', () => {
    const reportEvent = createReportEvent();
    const onEventKeyChange = jest.fn();

    const { rerender } = renderHook(useDocViewerViewedEvent, {
      initialProps: {
        reportEvent,
        contentId: 'content-1',
        tabId: 'tab-1',
        keys: ['doc-1'],
        onEventKeyChange,
      },
    });

    expect(onEventKeyChange).toHaveBeenCalledWith('content-1|tab-1|doc-1');
    expect(reportEvent).toHaveBeenCalledWith(DOC_VIEWER_VIEWED_EVENT_TYPE, {
      contentId: 'content-1',
      tabId: 'tab-1',
    });

    rerender({
      reportEvent,
      contentId: 'content-1',
      tabId: 'tab-1',
      keys: ['doc-1'],
      onEventKeyChange,
    });

    expect(reportEvent).toHaveBeenCalledTimes(1);

    rerender({
      reportEvent,
      contentId: 'content-1',
      tabId: 'tab-2',
      keys: ['doc-1'],
      onEventKeyChange,
    });

    expect(onEventKeyChange).toHaveBeenNthCalledWith(2, 'content-1|tab-2|doc-1');
    expect(reportEvent).toHaveBeenNthCalledWith(2, DOC_VIEWER_VIEWED_EVENT_TYPE, {
      contentId: 'content-1',
      tabId: 'tab-2',
    });
  });

  test('does not report when disabled', () => {
    const reportEvent = createReportEvent();

    const { rerender } = renderHook(useDocViewerViewedEvent, {
      initialProps: {
        reportEvent,
        contentId: 'content-1',
        tabId: 'tab-1',
        enabled: false,
      },
    });

    expect(reportEvent).not.toHaveBeenCalled();

    rerender({
      reportEvent,
      contentId: 'content-1',
      tabId: 'tab-1',
      enabled: true,
    });

    expect(reportEvent).toHaveBeenCalledWith(DOC_VIEWER_VIEWED_EVENT_TYPE, {
      contentId: 'content-1',
      tabId: 'tab-1',
    });
    expect(reportEvent).toHaveBeenCalledTimes(1);
  });

  test('does not report when the initial event key matches the current one', () => {
    const reportEvent = createReportEvent();

    renderHook(useDocViewerViewedEvent, {
      initialProps: {
        reportEvent,
        contentId: 'content-1',
        tabId: 'tab-1',
        keys: ['doc-1'],
        initialEventKey: 'content-1|tab-1|doc-1',
      },
    });

    expect(reportEvent).not.toHaveBeenCalled();
  });

  test('skips the next report when skipNextReport is true', () => {
    const reportEvent = createReportEvent();

    const { rerender } = renderHook(useDocViewerViewedEvent, {
      initialProps: {
        reportEvent,
        contentId: 'content-1',
        tabId: 'tab-1',
        skipNextReport: true,
      },
    });

    expect(reportEvent).not.toHaveBeenCalled();

    rerender({
      reportEvent,
      contentId: 'content-1',
      tabId: 'tab-2',
      skipNextReport: true,
    });

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent).toHaveBeenCalledWith(DOC_VIEWER_VIEWED_EVENT_TYPE, {
      contentId: 'content-1',
      tabId: 'tab-2',
    });
  });

  test('logs and swallows report errors', () => {
    const reportEvent = createReportEvent();
    const reportError = new Error('boom');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    reportEvent.mockImplementation(() => {
      throw reportError;
    });

    renderHook(useDocViewerViewedEvent, {
      initialProps: {
        reportEvent,
        contentId: 'content-1',
        tabId: 'tab-1',
      },
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Error reporting event ${DOC_VIEWER_VIEWED_EVENT_TYPE}:`,
      reportError
    );
  });
});

describe('useDocViewerTabViewedEvent', () => {
  test('reports the active tab for the root doc viewer content', () => {
    const reportEvent = createReportEvent();

    renderHook(useDocViewerTabViewedEvent, {
      initialProps: {
        reportEvent,
        hit: createHit('doc-1'),
        tabId: 'table',
      },
    });

    expect(reportEvent).toHaveBeenCalledWith(DOC_VIEWER_VIEWED_EVENT_TYPE, {
      contentId: DOC_VIEWER_VIEWED_ROOT_CONTENT_ID,
      tabId: 'table',
    });
  });

  test('does not report when there is no active tab', () => {
    const reportEvent = createReportEvent();

    renderHook(useDocViewerTabViewedEvent, {
      initialProps: {
        reportEvent,
        hit: createHit('doc-1'),
      },
    });

    expect(reportEvent).not.toHaveBeenCalled();
  });

  test('reports again when the hit id changes', () => {
    const reportEvent = createReportEvent();

    const { rerender } = renderHook(useDocViewerTabViewedEvent, {
      initialProps: {
        reportEvent,
        hit: createHit('doc-1'),
        tabId: 'table',
      },
    });

    rerender({
      reportEvent,
      hit: createHit('doc-2'),
      tabId: 'table',
    });

    expect(reportEvent).toHaveBeenCalledTimes(2);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFlyout } from './create_flyout';
import { BehaviorSubject, of, Subject } from 'rxjs';
import {
  httpServiceMock,
  notificationServiceMock,
  overlayServiceMock,
} from '@kbn/core/public/mocks';
import type { FlyoutDeps } from '../types';
import { IndexEditorTelemetryService } from '../telemetry/telemetry_service';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { AnalyticsServiceStart, CoreStart } from '@kbn/core/public';
import type { IndexUpdateService } from '../services/index_update_service';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

describe('createFlyout', () => {
  const coreStart = {
    http: httpServiceMock.createStartContract(),
    overlays: overlayServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    data: dataPluginMock.createStartContract(),
    application: {
      currentAppId$: new BehaviorSubject('my-app'),
    },
  };

  const indexEditorTelemetryService = new IndexEditorTelemetryService(
    {
      reportEvent: jest.fn(),
    } as unknown as AnalyticsServiceStart,
    true,
    true,
    'test-source'
  );

  const totalHits$ = new BehaviorSubject<number>(0);
  const dataTableColumns$ = new Subject<DatatableColumn[]>();

  const indexUpdateService = {
    setIndexName: jest.fn(),
    setIndexCreated: jest.fn(),
    exit: jest.fn(),
    completed$: of(),
    totalHits$,
    dataTableColumns$,
  } as unknown as IndexUpdateService;

  const deps: FlyoutDeps = {
    coreStart: coreStart as unknown as CoreStart,
    data: coreStart.data,
    indexUpdateService,
    indexEditorTelemetryService,
    uiActions: {} as UiActionsStart,
    fieldFormats: {} as FieldFormatsStart,
    share: {} as SharePluginStart,
    fileUpload: {} as FileUploadPluginStart,
    storage: {} as Storage,
    existingIndexName: undefined,
    kql: {} as KqlPluginStart,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    totalHits$.next(0);
    dataTableColumns$.next([]);
  });

  it('should call trackFlyoutOpened with correct data when index exists', async () => {
    const trackFlyoutOpenedSpy = jest.spyOn(deps.indexEditorTelemetryService, 'trackFlyoutOpened');

    createFlyout(deps, {
      doesIndexExist: true,
      indexName: 'test-index',
      canEditIndex: true,
      triggerSource: 'test-source',
    });

    totalHits$.next(10);
    dataTableColumns$.next([
      { id: 'field1', name: 'field1', meta: { type: 'string' } },
      { id: 'field2', name: 'field2', meta: { type: 'string' } },
    ]);

    expect(trackFlyoutOpenedSpy).toHaveBeenCalledWith({
      docCount: 10,
      fieldCount: 2,
    });
  });

  it('should call trackFlyoutOpened with zero counts when index does not exist', () => {
    const trackFlyoutOpenedSpy = jest.spyOn(deps.indexEditorTelemetryService, 'trackFlyoutOpened');

    createFlyout(deps, {
      doesIndexExist: false,
      canEditIndex: true,
      triggerSource: 'test-source',
    });

    expect(trackFlyoutOpenedSpy).toHaveBeenCalledWith({
      docCount: 0,
      fieldCount: 0,
    });
  });
});

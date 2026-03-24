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
    } as any,
    true,
    true,
    'test-source'
  );

  const indexUpdateService = {
    setIndexName: jest.fn(),
    setIndexCreated: jest.fn(),
    exit: jest.fn(),
    completed$: of(),
    totalHits$: new BehaviorSubject<number>(0),
    dataTableColumns$: new Subject<any[]>(),
  };

  const deps: FlyoutDeps = {
    coreStart: coreStart as any,
    data: coreStart.data,
    indexUpdateService: indexUpdateService as any,
    indexEditorTelemetryService,
    uiActions: {} as any,
    fieldFormats: {} as any,
    share: {} as any,
    fileUpload: {} as any,
    storage: {} as any,
    existingIndexName: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    indexUpdateService.totalHits$.next(0);
  });

  it('should call trackFlyoutOpened with correct data when index exists', async () => {
    const trackFlyoutOpenedSpy = jest.spyOn(deps.indexEditorTelemetryService, 'trackFlyoutOpened');

    createFlyout(deps, {
      doesIndexExist: true,
      indexName: 'test-index',
      canEditIndex: true,
      triggerSource: 'test-source',
    });

    indexUpdateService.totalHits$.next(10);
    indexUpdateService.dataTableColumns$.next([{ name: 'field1' }, { name: 'field2' }]);

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

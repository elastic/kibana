/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core/server';
import {
  ESQLEditorTelemetryService,
  ResourceBrowserType,
  ResourceBrowserOpenedFrom,
} from './telemetry_service';
import { DataSourceSelectionChange } from '@kbn/esql-resource-browser';
import {
  ESQL_LOOKUP_JOIN_ACTION_SHOWN,
  ESQL_RESOURCE_BROWSER_ITEM_TOGGLED,
  ESQL_RESOURCE_BROWSER_OPENED,
} from './events_registration';

describe('ESQLEditorTelemetryService', () => {
  let mockAnalytics: jest.Mocked<AnalyticsServiceStart>;
  let telemetryService: ESQLEditorTelemetryService;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    mockAnalytics = {
      reportEvent: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsServiceStart>;

    telemetryService = new ESQLEditorTelemetryService(mockAnalytics);

    // Mock console.log to avoid test output pollution
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  describe('trackLookupJoinHoverActionShown', () => {
    const createHoverMessage = (args: {
      indexName: string;
      doesIndexExist: boolean;
      canEditIndex: boolean;
      triggerSource?: string;
      highestPrivilege?: string;
    }) => {
      const commandArgs = encodeURIComponent(JSON.stringify(args));
      return `[Create index](command:esql.lookup_index.create?${commandArgs})`;
    };

    describe('when hover message contains lookup index command', () => {
      it('should track telemetry for create action when index does not exist', () => {
        const hoverMessage = createHoverMessage({
          indexName: 'my_index',
          doesIndexExist: false,
          canEditIndex: false,
          triggerSource: 'esql_hover',
          highestPrivilege: 'create',
        });

        telemetryService.trackLookupJoinHoverActionShown(hoverMessage);

        expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_LOOKUP_JOIN_ACTION_SHOWN, {
          trigger_source: 'esql_hover',
          trigger_action: 'create',
          highest_privilege: 'create',
        });
      });

      it('should track telemetry for edit action when index exists and user can edit', () => {
        const hoverMessage = createHoverMessage({
          indexName: 'existing_index',
          doesIndexExist: true,
          canEditIndex: true,
          triggerSource: 'esql_hover',
          highestPrivilege: 'edit',
        });

        telemetryService.trackLookupJoinHoverActionShown(hoverMessage);

        expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_LOOKUP_JOIN_ACTION_SHOWN, {
          trigger_source: 'esql_hover',
          trigger_action: 'edit',
          highest_privilege: 'edit',
        });
      });

      it('should track telemetry for read action when index exists but user cannot edit', () => {
        const hoverMessage = createHoverMessage({
          indexName: 'readonly_index',
          doesIndexExist: true,
          canEditIndex: false,
          triggerSource: 'esql_hover',
          highestPrivilege: 'read',
        });

        telemetryService.trackLookupJoinHoverActionShown(hoverMessage);

        expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_LOOKUP_JOIN_ACTION_SHOWN, {
          trigger_source: 'esql_hover',
          trigger_action: 'read',
          highest_privilege: 'read',
        });
      });
    });
    describe('when hover message does not contain lookup index command', () => {
      it('should not track telemetry for regular hover message', () => {
        const hoverMessage = 'This is a regular hover message without commands';

        telemetryService.trackLookupJoinHoverActionShown(hoverMessage);

        expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
      });

      it('should not track telemetry for different command', () => {
        const hoverMessage = '[Some action](command:other.command?{})';

        telemetryService.trackLookupJoinHoverActionShown(hoverMessage);

        expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
      });

      it('should not track telemetry for empty message', () => {
        telemetryService.trackLookupJoinHoverActionShown('');

        expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should not track telemetry when command data parsing fails', () => {
        const malformedHoverMessage =
          '[Create index](command:esql.lookup_index.create?invalid-json)';

        telemetryService.trackLookupJoinHoverActionShown(malformedHoverMessage);

        expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
      });

      it('should not track telemetry when command URI is malformed', () => {
        const malformedHoverMessage = '[Create index](command:esql.lookup_index.create?)';

        telemetryService.trackLookupJoinHoverActionShown(malformedHoverMessage);

        expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
      });

      it('should handle URL decoding errors gracefully', () => {
        const invalidEncodedMessage = '[Create index](command:esql.lookup_index.create?%GG)';

        telemetryService.trackLookupJoinHoverActionShown(invalidEncodedMessage);

        expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          'Failed to parse hover message command data',
          expect.any(Error)
        );
      });
    });
  });

  describe('resource browser telemetry', () => {
    it('tracks browser opened', () => {
      telemetryService.trackResourceBrowserOpened({
        browserType: ResourceBrowserType.DATA_SOURCES,
        openedFrom: ResourceBrowserOpenedFrom.AUTOCOMPLETE,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_RESOURCE_BROWSER_OPENED, {
        browser_type: 'data_sources',
        opened_from: 'autocomplete',
      });
    });

    it('tracks item toggled without including raw names', () => {
      telemetryService.trackResourceBrowserItemToggled({
        browserType: ResourceBrowserType.FIELDS,
        openedFrom: ResourceBrowserOpenedFrom.AUTOCOMPLETE,
        action: DataSourceSelectionChange.Add,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_RESOURCE_BROWSER_ITEM_TOGGLED, {
        browser_type: 'fields',
        opened_from: 'autocomplete',
        action: 'add',
      });

      const payload = (mockAnalytics.reportEvent as jest.Mock).mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(JSON.stringify(payload)).not.toContain('kibana_sample_data_logs');
    });
  });
});

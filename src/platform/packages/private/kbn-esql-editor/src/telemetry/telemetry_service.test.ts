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
  AiReviewAction,
  ResourceBrowserType,
  ResourceBrowserOpenedFrom,
} from './telemetry_service';
import { DataSourceSelectionChange } from '@kbn/esql-resource-browser';
import {
  ESQL_LOOKUP_JOIN_ACTION_SHOWN,
  ESQL_RESOURCE_BROWSER_ITEM_TOGGLED,
  ESQL_RESOURCE_BROWSER_OPENED,
  ESQL_VISOR_NL_SUBMITTED,
  ESQL_COMMENT_TO_ESQL_SUBMITTED,
  ESQL_COMMENT_TO_ESQL_REVIEWED,
  ESQL_FIX_WITH_AI_SUBMITTED,
  ESQL_FIX_WITH_AI_REVIEWED,
} from './events_registration';
import { reportEsqlError } from '../report_error';

jest.mock('../report_error', () => ({
  reportEsqlError: jest.fn(),
}));

describe('ESQLEditorTelemetryService', () => {
  let mockAnalytics: jest.Mocked<AnalyticsServiceStart>;
  let telemetryService: ESQLEditorTelemetryService;

  beforeEach(() => {
    mockAnalytics = {
      reportEvent: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsServiceStart>;

    telemetryService = new ESQLEditorTelemetryService(mockAnalytics);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
        expect(reportEsqlError).toHaveBeenCalledWith(expect.any(Error), {
          errorType: 'HoverMessageParse',
        });
      });
    });
  });

  describe('trackVisorNlSubmitted', () => {
    it('tracks a successful NL submission with all fields, omitting error_code', () => {
      telemetryService.trackVisorNlSubmitted({
        nlLength: 42,
        contextQueryLength: 100,
        success: true,
        durationMs: 1500,
        generatedQueryLength: 80,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_VISOR_NL_SUBMITTED, {
        nl_length: 42,
        context_query_length: 100,
        success: true,
        duration_ms: 1500,
        generated_query_length: 80,
      });
      const payload = (mockAnalytics.reportEvent as jest.Mock).mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload).not.toHaveProperty('error_code');
    });

    it('tracks a failed NL submission with error code, omitting generated_query_length', () => {
      telemetryService.trackVisorNlSubmitted({
        nlLength: 42,
        contextQueryLength: 100,
        success: false,
        durationMs: 300,
        errorCode: '500',
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_VISOR_NL_SUBMITTED, {
        nl_length: 42,
        context_query_length: 100,
        success: false,
        duration_ms: 300,
        error_code: '500',
      });
      const payload = (mockAnalytics.reportEvent as jest.Mock).mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload).not.toHaveProperty('generated_query_length');
    });

    it('omits error_code when not provided', () => {
      telemetryService.trackVisorNlSubmitted({
        nlLength: 10,
        contextQueryLength: 50,
        success: false,
        durationMs: 200,
      });

      const payload = (mockAnalytics.reportEvent as jest.Mock).mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload).not.toHaveProperty('error_code');
    });
  });

  describe('trackCommentToEsqlSubmitted', () => {
    it('tracks a successful comment-to-esql generation with all fields', () => {
      telemetryService.trackCommentToEsqlSubmitted({
        nlLength: 30,
        isCompletion: true,
        contextQueryLength: 60,
        success: true,
        durationMs: 2000,
        generatedLineCount: 3,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_COMMENT_TO_ESQL_SUBMITTED, {
        nl_length: 30,
        is_completion: true,
        context_query_length: 60,
        success: true,
        duration_ms: 2000,
        generated_line_count: 3,
      });
    });

    it('tracks a failed generation with error code, omitting generated_line_count', () => {
      telemetryService.trackCommentToEsqlSubmitted({
        nlLength: 30,
        isCompletion: false,
        contextQueryLength: 0,
        success: false,
        durationMs: 400,
        errorCode: '503',
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_COMMENT_TO_ESQL_SUBMITTED, {
        nl_length: 30,
        is_completion: false,
        context_query_length: 0,
        success: false,
        duration_ms: 400,
        error_code: '503',
      });
      const payload = (mockAnalytics.reportEvent as jest.Mock).mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload).not.toHaveProperty('generated_line_count');
    });
  });

  describe('trackCommentToEsqlReviewed', () => {
    it('tracks an accept action', () => {
      telemetryService.trackCommentToEsqlReviewed({
        action: AiReviewAction.ACCEPT,
        linesGenerated: 4,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_COMMENT_TO_ESQL_REVIEWED, {
        action: AiReviewAction.ACCEPT,
        lines_generated: 4,
      });
    });

    it('tracks a reject action', () => {
      telemetryService.trackCommentToEsqlReviewed({
        action: AiReviewAction.REJECT,
        linesGenerated: 2,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_COMMENT_TO_ESQL_REVIEWED, {
        action: AiReviewAction.REJECT,
        lines_generated: 2,
      });
    });
  });

  describe('trackFixWithAiSubmitted', () => {
    it('tracks a successful fix with all fields', () => {
      telemetryService.trackFixWithAiSubmitted({
        errorCode: 'SYNTAX_ERROR',
        queryLength: 120,
        success: true,
        durationMs: 1800,
        changedLineCount: 2,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_FIX_WITH_AI_SUBMITTED, {
        error_code: 'SYNTAX_ERROR',
        query_length: 120,
        success: true,
        duration_ms: 1800,
        changed_line_count: 2,
      });
    });

    it('tracks a failed fix, omitting changed_line_count', () => {
      telemetryService.trackFixWithAiSubmitted({
        queryLength: 120,
        success: false,
        durationMs: 500,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_FIX_WITH_AI_SUBMITTED, {
        query_length: 120,
        success: false,
        duration_ms: 500,
      });
      const payload = (mockAnalytics.reportEvent as jest.Mock).mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload).not.toHaveProperty('changed_line_count');
    });

    it('omits error_code when not provided', () => {
      telemetryService.trackFixWithAiSubmitted({
        queryLength: 50,
        success: true,
        durationMs: 1000,
        changedLineCount: 1,
      });

      const payload = (mockAnalytics.reportEvent as jest.Mock).mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload).not.toHaveProperty('error_code');
    });
  });

  describe('trackFixWithAiReviewed', () => {
    it('tracks an accept action', () => {
      telemetryService.trackFixWithAiReviewed({ action: AiReviewAction.ACCEPT, linesChanged: 3 });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_FIX_WITH_AI_REVIEWED, {
        action: AiReviewAction.ACCEPT,
        lines_changed: 3,
      });
    });

    it('tracks a reject action', () => {
      telemetryService.trackFixWithAiReviewed({ action: AiReviewAction.REJECT, linesChanged: 1 });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(ESQL_FIX_WITH_AI_REVIEWED, {
        action: AiReviewAction.REJECT,
        lines_changed: 1,
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

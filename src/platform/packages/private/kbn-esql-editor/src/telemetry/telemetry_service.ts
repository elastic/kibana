/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { AnalyticsServiceStart } from '@kbn/core/server';
import type { TelemetryQuerySubmittedProps } from '@kbn/esql-types/src/esql_telemetry_types';
import { QuerySource } from '@kbn/esql-types/src/esql_telemetry_types';
import { BasicPrettyPrinter, Parser } from '@kbn/esql-ast';
import {
  hasLimitBeforeAggregate,
  missingSortBeforeLimit,
} from '@kbn/esql-utils/src/utils/query_parsing_helpers';
import {
  ESQL_CONTROL_CONFIG_CANCELLED,
  ESQL_CONTROL_CONFIG_OPENED,
  ESQL_LOOKUP_JOIN_ACTION_SHOWN,
  ESQL_QUERY_HISTORY_CLICKED,
  ESQL_QUERY_HISTORY_OPENED,
  ESQL_QUERY_SUBMITTED,
  ESQL_RECOMMENDED_QUERY_CLICKED,
  ESQL_STARRED_QUERY_CLICKED,
  ESQL_SUGGESTIONS_WITH_CUSTOM_COMMAND_SHOWN,
} from './events_registration';
import type { IndexEditorCommandArgs } from '../custom_commands/use_lookup_index_editor';
import { COMMAND_ID as LOOKUP_INDEX_EDITOR_COMMAND } from '../custom_commands/use_lookup_index_editor';

export class ESQLEditorTelemetryService {
  constructor(private readonly _analytics: AnalyticsServiceStart) {}

  private _reportEvent(eventType: string, eventData: Record<string, unknown>) {
    try {
      this._analytics.reportEvent(eventType, eventData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Failed to report telemetry event', error);
    }
  }

  /**
   * Receives an hover message content.
   * If it corresponds to a lookup index action, the event is tracked.
   *
   * Example of hover message:
   * `[Create index](command:esql.lookup_index.create?%7B%22indexName%22%3A%22my_index%22%2C%22doesIndexExist%22%3Afalse%2C%22canEditIndex%22%3Afalse%2C%22triggerSource%22%3A%22esql_hover%22%7D)`
   *
   * @param hoverMessage The hover message content.
   * @returns
   */
  public trackLookupJoinHoverActionShown(hoverMessage: string) {
    if (!hoverMessage.includes(`command:${LOOKUP_INDEX_EDITOR_COMMAND}`)) {
      return;
    }

    let commandData: IndexEditorCommandArgs | undefined;

    try {
      // Extract the command URI from the markdown link format
      const commandMatch = hoverMessage.match(
        new RegExp(`command:${LOOKUP_INDEX_EDITOR_COMMAND}\\?([^)]+)`)
      );
      if (commandMatch && commandMatch[1]) {
        const decodedData = decodeURIComponent(commandMatch[1]);
        commandData = JSON.parse(decodedData) as IndexEditorCommandArgs;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Failed to parse hover message command data', error);
    }

    if (commandData) {
      const triggerAction = this._determineTriggerAction(commandData);

      this._reportEvent(ESQL_LOOKUP_JOIN_ACTION_SHOWN, {
        trigger_source: 'esql_hover',
        trigger_action: triggerAction,
        highest_privilege: commandData.highestPrivilege,
      });
    }
  }

  public trackSuggestionsWithCustomCommandShown(commandIds: string[]) {
    this._reportEvent(ESQL_SUGGESTIONS_WITH_CUSTOM_COMMAND_SHOWN, {
      command_ids: commandIds,
    });
  }

  private _determineTriggerAction(commandData: IndexEditorCommandArgs): string {
    if (!commandData.doesIndexExist) {
      return 'create';
    }
    return commandData.canEditIndex ? 'edit' : 'read';
  }

  public trackQueryHistoryOpened(isOpen: boolean) {
    if (isOpen) {
      this._reportEvent(ESQL_QUERY_HISTORY_OPENED, {});
    }
  }

  public trackQueryHistoryClicked(isStarredQuery: boolean = false) {
    if (isStarredQuery) {
      this._reportEvent(ESQL_STARRED_QUERY_CLICKED, {});
    } else {
      this._reportEvent(ESQL_QUERY_HISTORY_CLICKED, {});
    }
  }

  public trackQuerySubmitted({ source, query }: TelemetryQuerySubmittedProps) {
    // parsing and prettifying the raw query
    // to remove comments for accurately measuring its length
    const { root } = Parser.parse(query);
    const prettyQuery = BasicPrettyPrinter.print(root);
    const hasLimitBeforeStats =
      source === QuerySource.HELP || source === QuerySource.AUTOCOMPLETE
        ? false
        : hasLimitBeforeAggregate(query);
    const hasMissingSortBeforeLimit =
      source === QuerySource.HELP || source === QuerySource.AUTOCOMPLETE
        ? false
        : missingSortBeforeLimit(query);
    this._reportEvent(ESQL_QUERY_SUBMITTED, {
      query_source: source,
      query_length: prettyQuery.length.toString(),
      query_lines: query.split('\n').length.toString(),
      anti_limit_before_aggregate: hasLimitBeforeStats,
      anti_missing_sort_before_limit: hasMissingSortBeforeLimit,
    });
  }

  public trackRecommendedQueryClicked(
    source: QuerySource.HELP | QuerySource.AUTOCOMPLETE,
    label: string
  ) {
    this._reportEvent(ESQL_RECOMMENDED_QUERY_CLICKED, {
      trigger_source: source,
      recommended_query: label,
    });
  }

  public trackEsqlControlFlyoutOpened(controlType: string, source: string, query: string) {
    // parsing and prettifying the raw query
    // to remove comments for accurately measuring its length
    const { root } = Parser.parse(query);
    const prettyQuery = BasicPrettyPrinter.print(root);

    this._reportEvent(ESQL_CONTROL_CONFIG_OPENED, {
      control_kind: controlType,
      trigger_source: source,
      query_length: prettyQuery.length.toString(),
      query_lines: query.split('\n').length.toString(),
    });
  }

  public trackEsqlControlConfigCancelled(controlType: string, reason: string) {
    this._reportEvent(ESQL_CONTROL_CONFIG_CANCELLED, {
      control_kind: controlType,
      reason,
    });
  }
}

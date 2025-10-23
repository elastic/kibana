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
import {
  ESQL_LOOKUP_JOIN_ACTION_SHOWN,
  ESQL_QUERY_HISTORY_CLICKED,
  ESQL_QUERY_HISTORY_OPENED,
  ESQL_QUERY_SUBMITTED,
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

  public trackQuerySubmitted(props: TelemetryQuerySubmittedProps) {
    this._reportEvent(ESQL_QUERY_SUBMITTED, {
      query_source: props.query_source,
      query_length: props.query_length,
      query_lines: props.query_lines,
      anti_limit_before_aggregate: props.anti_limit_before_aggregate,
      anti_missing_sort_before_limit: props.anti_missing_sort_before_limit,
    });
  }
}

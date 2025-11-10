/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { IncompatibleActionError, type Action } from '@kbn/ui-actions-plugin/public';
import { firstValueFrom, of } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { ISearchGeneric } from '@kbn/search-types';
import { ESQLVariableType, type ESQLControlVariable, type ESQLControlState } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { dismissAllFlyoutsExceptFor, DiscoverFlyouts } from '@kbn/discover-utils';
import { openLazyFlyout } from '@kbn/presentation-util';
import { ACTION_CREATE_ESQL_CONTROL } from '../constants';
import { ESQLEditorTelemetryService } from '@kbn/esql-editor/src/telemetry/telemetry_service';

function isESQLVariableType(value: string): value is ESQLVariableType {
  return Object.values(ESQLVariableType).includes(value as ESQLVariableType);
}

export function isActionCompatible(core: CoreStart, variableType: ESQLVariableType) {
  return core.uiSettings.get(ENABLE_ESQL) && isESQLVariableType(variableType);
}

interface Context {
  queryString: string;
  variableType: ESQLVariableType;
  esqlVariables: ESQLControlVariable[];
  onSaveControl?: (controlState: ESQLControlState, updatedQuery: string) => Promise<void>;
  onCancelControl?: () => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
  parentApi?: unknown;
}

export class CreateESQLControlAction implements Action<Context> {
  public type = ACTION_CREATE_ESQL_CONTROL;
  public id = ACTION_CREATE_ESQL_CONTROL;
  public order = 50;

  private telemetryService: ESQLEditorTelemetryService;

  constructor(
    protected readonly core: CoreStart,
    protected readonly search: ISearchGeneric,
    protected readonly timefilter: TimefilterContract
  ) {
    this.telemetryService = new ESQLEditorTelemetryService(this.core.analytics);
  }

  public getDisplayName(): string {
    return i18n.translate('esql.createESQLControlLabel', {
      defaultMessage: 'Creates an ES|QL control',
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ variableType }: Context) {
    return isActionCompatible(this.core, variableType);
  }

  public async execute({
    queryString,
    variableType,
    esqlVariables,
    onSaveControl,
    onCancelControl,
    cursorPosition,
    initialState,
    parentApi,
  }: Context) {
    if (!isActionCompatible(this.core, variableType)) {
      throw new IncompatibleActionError();
    }
    const currentApp = await firstValueFrom(this.core.application.currentAppId$ ?? of(undefined));
    // Close all existing flyouts before opening the control flyout
    try {
      if (currentApp === 'discover') {
        dismissAllFlyoutsExceptFor(DiscoverFlyouts.esqlControls);
      }
    } catch (error) {
      // Flyouts don't exist or couldn't be closed, continue with opening the new flyout
    }

    openLazyFlyout({
      core: this.core,
      parentApi,
      loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
        this.telemetryService.trackEsqlControlFlyoutOpened(variableType);
        const { loadESQLControlFlyout } = await import('./esql_control_helpers');
        return await loadESQLControlFlyout({
          queryString,
          core: this.core,
          search: this.search,
          timefilter: this.timefilter,
          variableType,
          esqlVariables,
          ariaLabelledBy,
          onSaveControl,
          onCancelControl,
          cursorPosition,
          initialState,
          closeFlyout,
          currentApp,
        });
      },
      flyoutProps: {
        'data-test-subj': 'create_esql_control_flyout',
        isResizable: true,
        maxWidth: 800,
        triggerId: 'dashboard-controls-menu-button',
        // When queryString is present (i.e. flyout opened from the ES|QL editor),
        // use onCancelControl as the onClose handler to ensure proper nested flyout closing behavior.
        // In other scenarios (opened directly from the dashboard), we keep the default close behavior.
        ...(queryString && { onClose: onCancelControl }),
      },
    });
  }
}

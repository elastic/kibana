/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { type EsqlControlType, ESQLControlsFlyout } from '@kbn/esql-controls';
import type { CoreStart } from '@kbn/core/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { monaco } from '@kbn/monaco';
import { esqlVariablesService } from '@kbn/esql-variables/public';

interface Context {
  queryString: string;
  core: CoreStart;
  uiActions: UiActionsStart;
  controlType: EsqlControlType;
  dashboardApi: DashboardApi;
  panelId?: string;
  cursorPosition?: monaco.Position;
}

export async function isActionCompatible(queryString: string) {
  // we want to make sure that the current query is an ES|QL query
  return isOfAggregateQueryType({ esql: queryString });
}

export async function executeAction({
  queryString,
  core,
  uiActions,
  controlType,
  dashboardApi,
  panelId,
  cursorPosition,
}: Context) {
  const isCompatibleAction = await isActionCompatible(queryString);
  if (!isCompatibleAction) {
    throw new IncompatibleActionError();
  }

  const openEditFlyout = async (embeddable: unknown) => {
    await uiActions.getTrigger('EDIT_IN_DASH_TRIGGER').exec({
      embeddable,
    });
  };

  const addVariable = (key: string, value: string) => {
    esqlVariablesService.addVariable({ key, value });
  };

  const handle = core.overlays.openFlyout(
    toMountPoint(
      React.cloneElement(
        <ESQLControlsFlyout
          queryString={queryString}
          controlType={controlType}
          closeFlyout={() => {
            handle.close();
          }}
          dashboardApi={dashboardApi}
          panelId={panelId}
          cursorPosition={cursorPosition}
          openEditFlyout={openEditFlyout}
          addVariable={addVariable}
        />,
        {
          closeFlyout: () => {
            handle.close();
          },
        }
      ),
      core
    ),
    {
      size: 's',
      'data-test-subj': 'create_esql_control_flyout',
      type: 'push',
      paddingSize: 'm',
      hideCloseButton: true,
      onClose: (overlayRef) => {
        overlayRef.close();
      },
      outsideClickCloses: true,
    }
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { ESQLVariableType, EsqlControlType } from '@kbn/esql-types';
import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import { getAddESQLControlButtonTitle } from '../../_dashboard_app_strings';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { uiActionsService } from '../../../services/kibana_services';

interface Props {
  closePopover: () => void;
  controlGroupApi?: ControlGroupApi;
}

export const AddESQLControlButton = ({ closePopover, controlGroupApi, ...rest }: Props) => {
  const dashboardApi = useDashboardApi();

  const onSaveControl = (controlState: Record<string, unknown>) => {
    controlGroupApi?.addNewPanel({
      panelType: 'esqlControl',
      serializedState: {
        rawState: {
          ...controlState,
        },
      },
    });
    dashboardApi.scrollToTop();
    closePopover();
  };

  return (
    <EuiContextMenuItem
      {...rest}
      icon="plusInCircle"
      data-test-subj="esql-control-create-button"
      disabled={!controlGroupApi}
      aria-label={getAddESQLControlButtonTitle()}
      onClick={async () => {
        try {
          const variablesInParent = apiPublishesESQLVariables(dashboardApi)
            ? dashboardApi.esqlVariables$.value
            : [];

          await uiActionsService.getTrigger('ESQL_CONTROL_TRIGGER').exec({
            queryString: '',
            variableType: ESQLVariableType.VALUES,
            controlType: EsqlControlType.VALUES_FROM_QUERY,
            esqlVariables: variablesInParent,
            onSaveControl,
            onCancelControl: closePopover,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Error getting ESQL control trigger', e);
        }
        closePopover();
      }}
    >
      {getAddESQLControlButtonTitle()}
    </EuiContextMenuItem>
  );
};

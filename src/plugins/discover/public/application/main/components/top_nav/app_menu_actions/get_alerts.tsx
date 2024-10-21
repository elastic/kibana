/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { DataView } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import {
  AppMenuActionId,
  AppMenuActionSubmenuSecondary,
  AppMenuActionType,
} from '@kbn/discover-utils';
import {
  AlertConsumers,
  ES_QUERY_ID,
  RuleCreationValidConsumer,
  STACK_ALERTS_FEATURE_ID,
} from '@kbn/rule-data-utils';
import { RuleTypeMetaData } from '@kbn/alerting-plugin/common';
import { DiscoverStateContainer } from '../../../state_management/discover_state';
import { AppMenuDiscoverParams } from './types';

const EsQueryValidConsumer: RuleCreationValidConsumer[] = [
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.OBSERVABILITY,
  STACK_ALERTS_FEATURE_ID,
];

interface EsQueryAlertMetaData extends RuleTypeMetaData {
  isManagementPage?: boolean;
  adHocDataViewList: DataView[];
}

const CreateAlertFlyout: React.FC<{
  getDiscoverParams: () => AppMenuDiscoverParams;
  onFinishAction: () => void;
  stateContainer: DiscoverStateContainer;
}> = ({ stateContainer, getDiscoverParams, onFinishAction }) => {
  const query = stateContainer.appState.getState().query;

  const { dataView, services, isEsqlMode, adHocDataViews, onUpdateAdHocDataViews } =
    getDiscoverParams();
  const { triggersActionsUi } = services;
  const timeField = getTimeField(dataView);

  /**
   * Provides the default parameters used to initialize the new rule
   */
  const getParams = useCallback(() => {
    if (isEsqlMode) {
      return {
        searchType: 'esqlQuery',
        esqlQuery: query,
        timeField,
      };
    }
    const savedQueryId = stateContainer.appState.getState().savedQuery;
    return {
      searchType: 'searchSource',
      searchConfiguration: stateContainer.savedSearchState
        .getState()
        .searchSource.getSerializedFields(),
      savedQueryId,
    };
  }, [isEsqlMode, stateContainer.appState, stateContainer.savedSearchState, query, timeField]);

  const discoverMetadata: EsQueryAlertMetaData = useMemo(
    () => ({
      isManagementPage: false,
      adHocDataViewList: adHocDataViews,
    }),
    [adHocDataViews]
  );

  return triggersActionsUi?.getAddRuleFlyout({
    metadata: discoverMetadata,
    consumer: 'alerts',
    onClose: (_, metadata) => {
      onUpdateAdHocDataViews(metadata!.adHocDataViewList);
      onFinishAction();
    },
    onSave: async (metadata) => {
      onUpdateAdHocDataViews(metadata!.adHocDataViewList);
    },
    canChangeTrigger: false,
    ruleTypeId: ES_QUERY_ID,
    initialValues: { params: getParams() },
    validConsumers: EsQueryValidConsumer,
    useRuleProducer: true,
    // Default to the Logs consumer if it's available. This should fall back to Stack Alerts if it's not.
    initialSelectedConsumer: AlertConsumers.LOGS,
  });
};

export const getAlertsAppMenuItem = ({
  stateContainer,
  getDiscoverParams,
}: {
  getDiscoverParams: () => AppMenuDiscoverParams;
  stateContainer: DiscoverStateContainer;
}): AppMenuActionSubmenuSecondary => {
  const { dataView, services, isEsqlMode } = getDiscoverParams();
  const timeField = getTimeField(dataView);
  const hasTimeFieldName = !isEsqlMode ? Boolean(dataView?.timeFieldName) : Boolean(timeField);

  return {
    id: AppMenuActionId.alerts,
    type: AppMenuActionType.secondary,
    label: i18n.translate('discover.localMenu.localMenu.alertsTitle', {
      defaultMessage: 'Alerts',
    }),
    description: i18n.translate('discover.localMenu.alertsDescription', {
      defaultMessage: 'Alerts',
    }),
    testId: 'discoverAlertsButton',
    actions: [
      {
        id: 'createSearchThreshold',
        type: AppMenuActionType.secondary,
        controlProps: {
          label: i18n.translate('discover.alerts.createSearchThreshold', {
            defaultMessage: 'Create search threshold rule',
          }),
          testId: 'discoverCreateAlertButton',
          disableButton: !hasTimeFieldName,
          tooltip: hasTimeFieldName
            ? undefined
            : i18n.translate('discover.alerts.missedTimeFieldToolTip', {
                defaultMessage: 'Data view does not have a time field.',
              }),
          onClick: async (params) => {
            return (
              <CreateAlertFlyout
                {...params}
                getDiscoverParams={getDiscoverParams}
                stateContainer={stateContainer}
              />
            );
          },
        },
      },
      {
        id: 'alertsDivider',
        type: AppMenuActionType.submenuHorizontalRule,
      },
      {
        id: 'manageRulesAndConnectors',
        type: AppMenuActionType.secondary,
        controlProps: {
          label: i18n.translate('discover.alerts.manageRulesAndConnectors', {
            defaultMessage: 'Manage rules and connectors',
          }),
          testId: 'discoverManageAlertsButton',
          href: services.application.getUrlForApp(
            'management/insightsAndAlerting/triggersActions/rules'
          ),
          onClick: undefined,
        },
      },
    ],
  };
};

function getTimeField(dataView: DataView | undefined) {
  const dateFields = dataView?.fields.getByType('date');
  return dataView?.timeFieldName || dateFields?.[0]?.name;
}

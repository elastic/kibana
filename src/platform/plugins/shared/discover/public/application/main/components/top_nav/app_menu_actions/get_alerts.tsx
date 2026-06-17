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
import { AppMenuActionId } from '@kbn/discover-utils';
import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { AlertConsumers, ES_QUERY_ID, STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';
import type { RuleTypeMetaData } from '@kbn/alerting-plugin/common';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { isValidRuleFormPlugins } from '@kbn/response-ops-rule-form/lib';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DiscoverAppMenuItemType, DiscoverAppMenuPopoverItem } from '@kbn/discover-utils';
import type { CreateRuleOptionsFlyoutLegacyItem } from '@kbn/alerting-v2-plugin/public';
import type { AlertsLegacyRuleType } from '../../../../../context_awareness/types';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';
import { internalStateActions } from '../../../state_management/redux';
import { createSearchSource } from '../../../state_management/utils/create_search_source';
import type { DiscoverInternalState, InternalStateDispatch } from '../../../state_management/redux';
import { selectTab } from '../../../state_management/redux';

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

const RuleFormFlyoutWithType = RuleFormFlyout<EsQueryAlertMetaData>;

const CreateV1AlertFlyout: React.FC<{
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  tabId: string;
  getState: () => DiscoverInternalState;
  dispatch: InternalStateDispatch;
  onFinishAction: () => void;
}> = ({ discoverParams, services, tabId, getState, dispatch, onFinishAction = () => {} }) => {
  const { dataView, isEsqlMode, adHocDataViews } = discoverParams;
  const {
    triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
  } = services;

  // Get fresh tab state when the component renders
  const currentTab = selectTab(getState(), tabId);
  const timeField = getTimeField(dataView);
  const { query, savedQuery: savedQueryId } = currentTab.appState;

  const getParams = useCallback(() => {
    if (isEsqlMode) {
      return {
        searchType: 'esqlQuery',
        esqlQuery: query,
        timeField,
      };
    }
    const searchSource = createSearchSource({
      dataView,
      appState: currentTab.appState,
      globalState: currentTab.globalState,
      services,
    });
    return {
      searchType: 'searchSource',
      searchConfiguration: searchSource.getSerializedFields(),
      savedQueryId,
    };
  }, [isEsqlMode, currentTab, dataView, services, savedQueryId, query, timeField]);

  const discoverMetadata: EsQueryAlertMetaData = useMemo(
    () => ({
      isManagementPage: false,
      adHocDataViewList: adHocDataViews,
    }),
    [adHocDataViews]
  );

  // Some of the rule form's required plugins are from x-pack, so make sure they're defined before
  // rendering the flyout. The alerting plugin is also part of x-pack, so this check should probably never
  // return false. This is mostly here because Typescript requires us to mark x-pack plugins as optional.
  if (!isValidRuleFormPlugins(services)) return null;

  return (
    <RuleFormFlyoutWithType
      plugins={{
        ...services,
        ruleTypeRegistry,
        actionTypeRegistry,
      }}
      initialMetadata={discoverMetadata}
      consumer={'alerts'}
      onCancel={onFinishAction}
      onSubmit={onFinishAction}
      onChangeMetaData={(metadata: EsQueryAlertMetaData) => {
        void dispatch(internalStateActions.updateAdHocDataViews(metadata.adHocDataViewList));
      }}
      ruleTypeId={ES_QUERY_ID}
      initialValues={{ params: getParams() }}
      validConsumers={EsQueryValidConsumer}
      shouldUseRuleProducer
      // Default to the Logs consumer if it's available. This should fall back to Stack Alerts if it's not.
      multiConsumerSelection={AlertConsumers.LOGS}
    />
  );
};

export const getAlertsAppMenuItem = ({
  discoverParams,
  services,
  tabId,
  getState,
  dispatch,
  showCreateRuleV2,
  subscribe,
  additionalLegacyRuleTypes = [],
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  tabId: string;
  getState: () => DiscoverInternalState;
  dispatch: InternalStateDispatch;
  showCreateRuleV2?: boolean;
  subscribe: (listener: () => void) => () => void;
  additionalLegacyRuleTypes?: AlertsLegacyRuleType[];
}): DiscoverAppMenuItemType => {
  const { dataView, isEsqlMode } = discoverParams;
  const timeField = getTimeField(dataView);
  const hasTimeFieldName = !isEsqlMode ? Boolean(dataView?.timeFieldName) : Boolean(timeField);

  if (showCreateRuleV2) {
    const CreateRuleOptionsFlyout = services.alertingVTwo?.CreateRuleOptionsFlyout;
    const legacyRuleTypes: CreateRuleOptionsFlyoutLegacyItem[] = [];

    if (
      services.capabilities.management?.insightsAndAlerting?.triggersActions &&
      discoverParams.authorizedRuleTypeIds.includes(ES_QUERY_ID)
    ) {
      legacyRuleTypes.push({
        id: 'search-threshold-rule',
        label: i18n.translate('discover.alerts.legacySearchThreshold', {
          defaultMessage: 'Search threshold rule',
        }),
        'data-test-subj': 'discoverLegacySearchThresholdRule',
        render: (onClose) => (
          <CreateV1AlertFlyout
            onFinishAction={onClose}
            discoverParams={discoverParams}
            services={services}
            tabId={tabId}
            getState={getState}
            dispatch={dispatch}
          />
        ),
      });
    }

    legacyRuleTypes.push(...additionalLegacyRuleTypes);

    if (CreateRuleOptionsFlyout) {
      return {
        id: AppMenuActionId.alerts,
        label: i18n.translate('discover.localMenu.alertsTitle', {
          defaultMessage: 'Create alert rule',
        }),
        testId: 'discoverAlertsButton',
        order: 11,
        iconType: 'warning',
        run: ({ context: { onFinishAction } }) => {
          const tab = selectTab(getState(), tabId);
          const { query } = tab.appState;
          const esqlQuery = isOfAggregateQueryType(query) ? query.esql : undefined;
          const esqlVariables = tab.esqlVariables;

          const getQuerySnapshot = () => {
            const { query: q } = selectTab(getState(), tabId).appState;
            return isOfAggregateQueryType(q) ? q.esql : undefined;
          };
          const getEsqlVariablesSnapshot = () => selectTab(getState(), tabId).esqlVariables;

          return (
            <CreateRuleOptionsFlyout
              onClose={onFinishAction}
              initialQuery={esqlQuery}
              esqlVariables={esqlVariables}
              legacyRuleTypes={legacyRuleTypes}
              subscribe={subscribe}
              getQuery={getQuerySnapshot}
              getEsqlVariables={getEsqlVariablesSnapshot}
              history={services.history}
            />
          );
        },
      };
    }
  }

  const items: DiscoverAppMenuPopoverItem[] = [];

  if (services.capabilities.management?.insightsAndAlerting?.triggersActions) {
    items.push({
      id: AppMenuActionId.manageRulesAndConnectors,
      order: Number.MAX_SAFE_INTEGER,
      label: i18n.translate('discover.alerts.manageRulesAndConnectors', {
        defaultMessage: 'Manage rules and connectors',
      }),
      iconType: 'tableOfContents',
      testId: 'discoverManageAlertsButton',
      href: getManageRulesUrl(services),
    });

    if (discoverParams.authorizedRuleTypeIds.includes(ES_QUERY_ID)) {
      items.push({
        id: AppMenuActionId.createRule,
        order: 1,
        label: i18n.translate('discover.alerts.createSearchThreshold', {
          defaultMessage: 'Create search threshold rule',
        }),
        iconType: 'bell',
        testId: 'discoverCreateAlertButton',
        disableButton: !hasTimeFieldName,
        tooltipContent: hasTimeFieldName
          ? undefined
          : i18n.translate('discover.alerts.missedTimeFieldToolTip', {
              defaultMessage: 'Data view does not have a time field.',
            }),
        run: ({ context: { onFinishAction } }) => {
          return (
            <CreateV1AlertFlyout
              onFinishAction={onFinishAction}
              discoverParams={discoverParams}
              services={services}
              tabId={tabId}
              getState={getState}
              dispatch={dispatch}
            />
          );
        },
      });
    }
  }

  return {
    id: AppMenuActionId.alerts,
    label: i18n.translate('discover.localMenu.alertsTitle', {
      defaultMessage: 'Create alert rule',
    }),
    testId: 'discoverAlertsButton',
    order: 11,
    iconType: 'warning',
    popoverWidth: 250,
    items,
  };
};

function getTimeField(dataView: DataView | undefined) {
  const dateFields = dataView?.fields.getByType('date');
  return dataView?.timeFieldName || dateFields?.[0]?.name;
}

function getManageRulesUrl(services: DiscoverServices) {
  return services.application.getUrlForApp(
    services.application.isAppRegistered('rules')
      ? 'rules'
      : 'management/insightsAndAlerting/triggersActions/rules'
  );
}

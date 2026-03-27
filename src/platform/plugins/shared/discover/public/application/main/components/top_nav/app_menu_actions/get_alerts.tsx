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
import type { DiscoverAppMenuItemType, DiscoverAppMenuPopoverItem } from '@kbn/discover-utils';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';
import { createSearchSource } from '../../../state_management/utils/create_search_source';
import type { DiscoverInternalState } from '../../../state_management/redux';
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

const CreateAlertFlyout: React.FC<{
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  tabId: string;
  getState: () => DiscoverInternalState;
  onFinishAction: () => void;
}> = ({ discoverParams, services, tabId, getState, onFinishAction = () => {} }) => {
  const {
    dataView,
    isEsqlMode,
    adHocDataViews,
    actions: { updateAdHocDataViews },
  } = discoverParams;
  const {
    triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
  } = services;

  // Get fresh tab state when the component renders
  const currentTab = selectTab(getState(), tabId);
  const timeField = getTimeField(dataView);
  const { query, savedQuery: savedQueryId } = currentTab.appState;

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
      onChangeMetaData={(metadata: EsQueryAlertMetaData) =>
        updateAdHocDataViews(metadata.adHocDataViewList)
      }
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
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  tabId: string;
  getState: () => DiscoverInternalState;
}): DiscoverAppMenuItemType => {
  const { dataView, isEsqlMode } = discoverParams;
  const timeField = getTimeField(dataView);
  const hasTimeFieldName = !isEsqlMode ? Boolean(dataView?.timeFieldName) : Boolean(timeField);

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
            <CreateAlertFlyout
              onFinishAction={onFinishAction}
              discoverParams={discoverParams}
              services={services}
              tabId={tabId}
              getState={getState}
            />
          );
        },
      });
    }
  }

  return {
    id: AppMenuActionId.alerts,
    label: i18n.translate('discover.localMenu.localMenu.alertsTitle', {
      defaultMessage: 'Alerts',
    }),
    testId: 'discoverAlertsButton',
    order: 4,
    iconType: 'alert',
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

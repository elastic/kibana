/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { EuiWrappingPopover, EuiContextMenu } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-plugin/common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  AlertConsumers,
  ES_QUERY_ID,
  RuleCreationValidConsumer,
  STACK_ALERTS_FEATURE_ID,
} from '@kbn/rule-data-utils';
import { RuleTypeMetaData } from '@kbn/alerting-plugin/common';
import { DiscoverStateContainer } from '../../services/discover_state';
import { DiscoverServices } from '../../../../build_services';

const container = document.createElement('div');
let isOpen = false;

const EsQueryValidConsumer: RuleCreationValidConsumer[] = [
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.OBSERVABILITY,
  STACK_ALERTS_FEATURE_ID,
];

interface AlertsPopoverProps {
  onClose: () => void;
  anchorElement: HTMLElement;
  stateContainer: DiscoverStateContainer;
  savedQueryId?: string;
  adHocDataViews: DataView[];
  services: DiscoverServices;
  isPlainRecord?: boolean;
}

interface EsQueryAlertMetaData extends RuleTypeMetaData {
  isManagementPage?: boolean;
  adHocDataViewList: DataView[];
}

export function AlertsPopover({
  anchorElement,
  adHocDataViews,
  services,
  stateContainer,
  onClose: originalOnClose,
  isPlainRecord,
}: AlertsPopoverProps) {
  const dataView = stateContainer.internalState.getState().dataView;
  const query = stateContainer.appState.getState().query;
  const dateFields = dataView?.fields.getByType('date');
  const timeField = dataView?.timeFieldName || dateFields?.[0]?.name;

  const { triggersActionsUi } = services;
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState(false);
  const onClose = useCallback(() => {
    originalOnClose();
    anchorElement?.focus();
  }, [anchorElement, originalOnClose]);

  /**
   * Provides the default parameters used to initialize the new rule
   */
  const getParams = useCallback(() => {
    if (isPlainRecord) {
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
  }, [isPlainRecord, stateContainer.appState, stateContainer.savedSearchState, query, timeField]);

  const discoverMetadata: EsQueryAlertMetaData = useMemo(
    () => ({
      isManagementPage: false,
      adHocDataViewList: adHocDataViews,
    }),
    [adHocDataViews]
  );

  const SearchThresholdAlertFlyout = useMemo(() => {
    if (!alertFlyoutVisible) {
      return;
    }

    const onFinishFlyoutInteraction = async (metadata: EsQueryAlertMetaData) => {
      await stateContainer.actions.loadDataViewList();
      stateContainer.internalState.transitions.setAdHocDataViews(metadata.adHocDataViewList);
    };

    return triggersActionsUi?.getAddRuleFlyout({
      metadata: discoverMetadata,
      consumer: 'alerts',
      onClose: (_, metadata) => {
        onFinishFlyoutInteraction(metadata!);
        onClose();
      },
      onSave: async (metadata) => {
        onFinishFlyoutInteraction(metadata!);
      },
      canChangeTrigger: false,
      ruleTypeId: ES_QUERY_ID,
      initialValues: { params: getParams() },
      validConsumers: EsQueryValidConsumer,
      useRuleProducer: true,
      // Default to the Logs consumer if it's available. This should fall back to Stack Alerts if it's not.
      initialSelectedConsumer: AlertConsumers.LOGS,
    });
  }, [alertFlyoutVisible, triggersActionsUi, discoverMetadata, getParams, onClose, stateContainer]);

  const hasTimeFieldName: boolean = useMemo(() => {
    if (!isPlainRecord) {
      return Boolean(dataView?.timeFieldName);
    } else {
      return Boolean(timeField);
    }
  }, [dataView?.timeFieldName, isPlainRecord, timeField]);

  const panels = [
    {
      id: 'mainPanel',
      name: 'Alerting',
      items: [
        {
          name: (
            <FormattedMessage
              id="discover.alerts.createSearchThreshold"
              defaultMessage="Create search threshold rule"
            />
          ),
          icon: 'bell',
          onClick: () => setAlertFlyoutVisibility(true),
          disabled: !hasTimeFieldName,
          toolTipContent: hasTimeFieldName ? undefined : (
            <FormattedMessage
              id="discover.alerts.missedTimeFieldToolTip"
              defaultMessage="Data view does not have a time field."
            />
          ),
          ['data-test-subj']: 'discoverCreateAlertButton',
        },
        {
          name: (
            <FormattedMessage
              id="discover.alerts.manageRulesAndConnectors"
              defaultMessage="Manage rules and connectors"
            />
          ),
          icon: 'tableOfContents',
          href: services?.application?.getUrlForApp(
            'management/insightsAndAlerting/triggersActions/rules'
          ),
          ['data-test-subj']: 'discoverManageAlertsButton',
        },
      ],
    },
  ];

  return (
    <>
      {SearchThresholdAlertFlyout}
      <EuiWrappingPopover
        ownFocus
        button={anchorElement}
        closePopover={onClose}
        isOpen={!alertFlyoutVisible}
      >
        <EuiContextMenu initialPanelId="mainPanel" panels={panels} />
      </EuiWrappingPopover>
    </>
  );
}

function closeAlertsPopover() {
  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isOpen = false;
}

export function openAlertsPopover({
  anchorElement,
  stateContainer,
  services,
  adHocDataViews,
  isPlainRecord,
}: {
  anchorElement: HTMLElement;
  stateContainer: DiscoverStateContainer;
  services: DiscoverServices;
  adHocDataViews: DataView[];
  isPlainRecord?: boolean;
}) {
  if (isOpen) {
    closeAlertsPopover();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);

  const element = (
    <KibanaRenderContextProvider theme={services.core.theme} i18n={services.core.i18n}>
      <KibanaContextProvider services={services}>
        <AlertsPopover
          onClose={closeAlertsPopover}
          anchorElement={anchorElement}
          stateContainer={stateContainer}
          adHocDataViews={adHocDataViews}
          services={services}
          isPlainRecord={isPlainRecord}
        />
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
  ReactDOM.render(element, container);
}

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
import { DiscoverStateContainer } from '../../services/discover_state';
import { DiscoverServices } from '../../../../build_services';

const container = document.createElement('div');
let isOpen = false;

const ALERT_TYPE_ID = '.es-query';

interface AlertsPopoverProps {
  onClose: () => void;
  anchorElement: HTMLElement;
  stateContainer: DiscoverStateContainer;
  savedQueryId?: string;
  adHocDataViews: DataView[];
  services: DiscoverServices;
}

interface EsQueryAlertMetaData {
  isManagementPage?: boolean;
  adHocDataViewList: DataView[];
}

export function AlertsPopover({
  anchorElement,
  adHocDataViews,
  services,
  stateContainer,
  onClose: originalOnClose,
}: AlertsPopoverProps) {
  const dataView = stateContainer.internalState.getState().dataView;
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
    const savedQueryId = stateContainer.appState.getState().savedQuery;
    return {
      searchType: 'searchSource',
      searchConfiguration: stateContainer.savedSearchState
        .getState()
        .searchSource.getSerializedFields(),
      savedQueryId,
    };
  }, [stateContainer]);

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
      consumer: 'discover',
      onClose: (_, metadata) => {
        onFinishFlyoutInteraction(metadata as EsQueryAlertMetaData);
        onClose();
      },
      onSave: async (metadata) => {
        onFinishFlyoutInteraction(metadata as EsQueryAlertMetaData);
      },
      canChangeTrigger: false,
      ruleTypeId: ALERT_TYPE_ID,
      initialValues: { params: getParams() },
    });
  }, [alertFlyoutVisible, triggersActionsUi, discoverMetadata, getParams, onClose, stateContainer]);

  const hasTimeFieldName = Boolean(dataView?.timeFieldName);
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
            'management/insightsAndAlerting/triggersActions/alerts'
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
}: {
  anchorElement: HTMLElement;
  stateContainer: DiscoverStateContainer;
  services: DiscoverServices;
  adHocDataViews: DataView[];
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
        />
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
  ReactDOM.render(element, container);
}

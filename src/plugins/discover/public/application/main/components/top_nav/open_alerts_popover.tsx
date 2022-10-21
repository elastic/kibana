/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { I18nStart } from '@kbn/core/public';
import { EuiWrappingPopover, EuiContextMenu } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataView, ISearchSource } from '@kbn/data-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DiscoverServices } from '../../../../build_services';
import { updateSearchSource } from '../../utils/update_search_source';

const container = document.createElement('div');
let isOpen = false;

const ALERT_TYPE_ID = '.es-query';

interface AlertsPopoverProps {
  onClose: () => void;
  anchorElement: HTMLElement;
  searchSource: ISearchSource;
  savedQueryId?: string;
  adHocDataViews: DataView[];
  I18nContext: I18nStart['Context'];
  services: DiscoverServices;
  onAddAdHocDataViews: (dataViews: DataView[]) => void;
}

interface EsQueryAlertMetaData {
  isManagementPage?: boolean;
  adHocDataViewList: DataView[];
}

export function AlertsPopover({
  searchSource,
  anchorElement,
  savedQueryId,
  adHocDataViews,
  services,
  onClose: originalOnClose,
  onAddAdHocDataViews,
}: AlertsPopoverProps) {
  const dataView = searchSource.getField('index')!;
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
    const nextSearchSource = searchSource.createCopy();
    updateSearchSource(nextSearchSource, true, {
      dataView: searchSource.getField('index')!,
      services,
      sort: [],
      useNewFieldsApi: true,
    });

    return {
      searchType: 'searchSource',
      searchConfiguration: nextSearchSource.getSerializedFields(),
      savedQueryId,
    };
  }, [savedQueryId, searchSource, services]);

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

    const onFinishFlyoutInteraction = (metadata: EsQueryAlertMetaData) => {
      onAddAdHocDataViews(metadata.adHocDataViewList);
    };

    return triggersActionsUi?.getAddAlertFlyout({
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
  }, [
    alertFlyoutVisible,
    triggersActionsUi,
    discoverMetadata,
    getParams,
    onAddAdHocDataViews,
    onClose,
  ]);

  const hasTimeFieldName = dataView.timeFieldName;
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
  I18nContext,
  anchorElement,
  searchSource,
  services,
  adHocDataViews,
  savedQueryId,
  onAddAdHocDataViews,
}: {
  I18nContext: I18nStart['Context'];
  anchorElement: HTMLElement;
  searchSource: ISearchSource;
  services: DiscoverServices;
  adHocDataViews: DataView[];
  savedQueryId?: string;
  onAddAdHocDataViews: (dataViews: DataView[]) => void;
}) {
  if (isOpen) {
    closeAlertsPopover();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);

  const element = (
    <I18nContext>
      <KibanaContextProvider services={services}>
        <AlertsPopover
          onClose={closeAlertsPopover}
          anchorElement={anchorElement}
          searchSource={searchSource}
          savedQueryId={savedQueryId}
          adHocDataViews={adHocDataViews}
          I18nContext={I18nContext}
          services={services}
          onAddAdHocDataViews={onAddAdHocDataViews}
        />
      </KibanaContextProvider>
    </I18nContext>
  );
  ReactDOM.render(element, container);
}

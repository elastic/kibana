/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { I18nStart } from 'kibana/public';
import { EuiWrappingPopover, EuiLink, EuiContextMenu, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ISearchSource } from '../../../../../../data/common';
import { KibanaContextProvider } from '../../../../../../kibana_react/public';
import { DiscoverServices } from '../../../../build_services';
import { updateSearchSource } from '../../utils/update_search_source';
import { useDiscoverServices } from '../../../../utils/use_discover_services';

const container = document.createElement('div');
let isOpen = false;

const ALERT_TYPE_ID = '.es-query';

interface AlertsPopoverProps {
  onClose: () => void;
  anchorElement: HTMLElement;
  searchSource: ISearchSource;
}

export function AlertsPopover({ searchSource, anchorElement, onClose }: AlertsPopoverProps) {
  const dataView = searchSource.getField('index')!;
  const services = useDiscoverServices();
  const { triggersActionsUi } = services;
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState(false);

  /**
   * Provides the default parameters used to initialize the new rule
   */
  const getParams = useCallback(() => {
    const nextSearchSource = searchSource.createCopy();
    updateSearchSource(nextSearchSource, true, {
      indexPattern: searchSource.getField('index')!,
      services,
      sort: [],
      useNewFieldsApi: true,
    });

    return {
      searchType: 'searchSource',
      searchConfiguration: nextSearchSource.getSerializedFields(),
    };
  }, [searchSource, services]);

  const SearchThresholdAlertFlyout = useMemo(() => {
    if (!alertFlyoutVisible) {
      return;
    }
    return triggersActionsUi?.getAddAlertFlyout({
      consumer: 'discover',
      onClose,
      canChangeTrigger: false,
      ruleTypeId: ALERT_TYPE_ID,
      initialValues: {
        params: getParams(),
      },
    });
  }, [getParams, onClose, triggersActionsUi, alertFlyoutVisible]);

  const hasTimeFieldName = dataView.timeFieldName;
  let createSearchThresholdRuleLink = (
    <EuiLink
      data-test-subj="discoverCreateAlertButton"
      onClick={() => setAlertFlyoutVisibility(true)}
      disabled={!hasTimeFieldName}
    >
      <FormattedMessage
        id="discover.alerts.createSearchThreshold"
        defaultMessage="Create search threshold rule"
      />
    </EuiLink>
  );

  if (!hasTimeFieldName) {
    const toolTipContent = (
      <FormattedMessage
        id="discover.alerts.missedTimeFieldToolTip"
        defaultMessage="Data view does not have a time field."
      />
    );
    createSearchThresholdRuleLink = (
      <EuiToolTip position="top" content={toolTipContent}>
        {createSearchThresholdRuleLink}
      </EuiToolTip>
    );
  }

  const panels = [
    {
      id: 'mainPanel',
      name: 'Alerting',
      items: [
        {
          name: (
            <>
              {SearchThresholdAlertFlyout}
              {createSearchThresholdRuleLink}
            </>
          ),
          icon: 'bell',
          disabled: !hasTimeFieldName,
        },
        {
          name: (
            <EuiLink
              color="text"
              href={services?.application?.getUrlForApp(
                'management/insightsAndAlerting/triggersActions/alerts'
              )}
            >
              <FormattedMessage
                id="discover.alerts.manageRulesAndConnectors"
                defaultMessage="Manage rules and connectors"
              />
            </EuiLink>
          ),
          icon: 'tableOfContents',
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
}: {
  I18nContext: I18nStart['Context'];
  anchorElement: HTMLElement;
  searchSource: ISearchSource;
  services: DiscoverServices;
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
        />
      </KibanaContextProvider>
    </I18nContext>
  );
  ReactDOM.render(element, container);
}

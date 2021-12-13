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
import { EuiWrappingPopover, EuiLink, EuiContextMenu } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ISearchSource } from '../../../../../../data/common';
import { KibanaContextProvider, useKibana } from '../../../../../../kibana_react/public';
import { DiscoverServices } from '../../../../build_services';
import { updateSearchSource } from '../../utils/update_search_source';

const container = document.createElement('div');
let isOpen = false;

interface AlertsPopoverProps {
  onClose: () => void;
  anchorElement: HTMLElement;
  searchSource: ISearchSource;
}

export function AlertsPopover(props: AlertsPopoverProps) {
  const dataView = props.searchSource.getField('index')!;
  const searchSource = props.searchSource;
  const { services } = useKibana<DiscoverServices>();
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);

  const { triggersActionsUi } = useKibana<DiscoverServices>().services;

  const onCloseAlertFlyout = useCallback(
    () => setAlertFlyoutVisibility(false),
    [setAlertFlyoutVisibility]
  );
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
      searchSource: nextSearchSource.getSerializedFields(),
    };
  }, [searchSource, services]);

  const SearchThresholdAlertFlyout = useMemo(() => {
    if (!alertFlyoutVisible) {
      return;
    }
    return triggersActionsUi?.getAddAlertFlyout({
      consumer: 'discover',
      onClose: onCloseAlertFlyout,
      canChangeTrigger: false,
      alertTypeId: '.search-threshold',
      initialValues: {
        params: getParams(),
      },
    });
  }, [getParams, onCloseAlertFlyout, triggersActionsUi, alertFlyoutVisible]);

  const panels = [
    {
      id: 'mainPanel',
      name: 'Alerting',
      items: [
        {
          name: (
            <>
              {SearchThresholdAlertFlyout}
              <EuiLink
                onClick={() => {
                  setAlertFlyoutVisibility(true);
                }}
              >
                <FormattedMessage
                  id="discover.alerts.createSearchThreshold"
                  defaultMessage="Create search threshold rule"
                />
              </EuiLink>
            </>
          ),
          icon: 'bell',
          disabled: !dataView.timeFieldName,
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
        button={props.anchorElement}
        closePopover={props.onClose}
        isOpen={!alertFlyoutVisible}
      >
        <EuiContextMenu initialPanelId="mainPanel" panels={panels} />
      </EuiWrappingPopover>
    </>
  );
}

function onClose() {
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
    onClose();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);

  const element = (
    <I18nContext>
      <KibanaContextProvider services={services}>
        <AlertsPopover
          onClose={onClose}
          anchorElement={anchorElement}
          searchSource={searchSource}
        />
      </KibanaContextProvider>
    </I18nContext>
  );
  ReactDOM.render(element, container);
}

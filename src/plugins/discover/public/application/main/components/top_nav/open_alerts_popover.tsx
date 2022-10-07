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
import { DataViewSpec, ISearchSource, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { IUnifiedSearchPluginServices } from '@kbn/unified-search-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { pick } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DiscoverServices } from '../../../../build_services';
import { updateSearchSource } from '../../utils/update_search_source';
import { DiscoverAlertContextProvider } from '../../utils/discover_alert_context';

/**
 * Unified search services needed, since SearchBar component is used internally
 */
export interface DiscoverAlertServices extends IUnifiedSearchPluginServices {
  dataViewEditor: DataViewEditorStart;
}

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
  discoverAlertServices: DiscoverAlertServices;
  addAdHocDataView: (dataView: DataView) => void;
  updateAdHocDataViewId: (dataView: DataView, updateState?: boolean) => Promise<DataView>;
}

export function AlertsPopover({
  searchSource,
  anchorElement,
  savedQueryId,
  I18nContext,
  adHocDataViews,
  services,
  discoverAlertServices,
  onClose: originalOnClose,
  addAdHocDataView,
  updateAdHocDataViewId,
}: AlertsPopoverProps) {
  const dataView = searchSource.getField('index')!;
  const { triggersActionsUi, dataViews, data } = services;
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

  const discoverAlertContext = useMemo(
    () => ({
      isManagementPage: false,
      initialAdHocDataViewList: adHocDataViews.map((currentDataView) => ({
        id: currentDataView.id!,
        title: currentDataView.title,
        name: currentDataView.name,
      })),
      addAdHocDataView,
    }),
    [adHocDataViews, addAdHocDataView]
  );

  const SearchThresholdAlertFlyout = useMemo(() => {
    if (!alertFlyoutVisible) {
      return;
    }
    return triggersActionsUi?.getAddAlertFlyout({
      consumer: 'discover',
      beforeSave: async (rule) => {
        const searchConfiguration = rule.params.searchConfiguration as SerializedSearchSourceFields;
        if (
          !searchConfiguration ||
          typeof searchConfiguration.index !== 'object' ||
          !searchConfiguration.index?.id
        ) {
          return rule;
        }

        // update adhoc data view ids
        const dataViewInstance = await dataViews.get(
          (searchConfiguration!.index as DataViewSpec).id!
        );
        if (!dataViewInstance.isPersisted()) {
          const updatedDataView = await updateAdHocDataViewId(dataViewInstance, false);

          const tempSearchSource = await data.search.searchSource.create(
            rule.params.searchConfiguration as SerializedSearchSourceFields
          );
          tempSearchSource.setField('index', updatedDataView);
          rule.params.searchConfiguration = tempSearchSource.getSerializedFields(false, false);
          addAdHocDataView(updatedDataView);
        }
        return rule;
      },
      onClose,
      canChangeTrigger: false,
      ruleTypeId: ALERT_TYPE_ID,
      initialValues: {
        params: getParams(),
      },
    });
  }, [
    alertFlyoutVisible,
    triggersActionsUi,
    onClose,
    getParams,
    dataViews,
    updateAdHocDataViewId,
    data.search.searchSource,
    addAdHocDataView,
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
    <I18nContext>
      <KibanaContextProvider services={discoverAlertServices}>
        <DiscoverAlertContextProvider value={discoverAlertContext}>
          {SearchThresholdAlertFlyout}
          <EuiWrappingPopover
            ownFocus
            button={anchorElement}
            closePopover={onClose}
            isOpen={!alertFlyoutVisible}
          >
            <EuiContextMenu initialPanelId="mainPanel" panels={panels} />
          </EuiWrappingPopover>
        </DiscoverAlertContextProvider>
      </KibanaContextProvider>
    </I18nContext>
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
  addAdHocDataView,
  updateAdHocDataViewId,
}: {
  I18nContext: I18nStart['Context'];
  anchorElement: HTMLElement;
  searchSource: ISearchSource;
  services: DiscoverServices;
  adHocDataViews: DataView[];
  savedQueryId?: string;
  addAdHocDataView: (dataView: DataView) => void;
  updateAdHocDataViewId: (dataView: DataView, updateState?: boolean) => Promise<DataView>;
}) {
  const discoverAlertServices: DiscoverAlertServices = {
    ...pick(services, [
      'unifiedSearch',
      'uiSettings',
      'notifications',
      'savedObjects',
      'application',
      'http',
      'storage',
      'docLinks',
      'dataViews',
      'data',
      'dataViewEditor',
    ]),
    appName: 's',
  };

  if (isOpen) {
    closeAlertsPopover();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);

  const element = (
    <AlertsPopover
      onClose={closeAlertsPopover}
      anchorElement={anchorElement}
      searchSource={searchSource}
      savedQueryId={savedQueryId}
      adHocDataViews={adHocDataViews}
      I18nContext={I18nContext}
      services={services}
      discoverAlertServices={discoverAlertServices}
      addAdHocDataView={addAdHocDataView}
      updateAdHocDataViewId={updateAdHocDataViewId}
    />
  );
  ReactDOM.render(element, container);
}

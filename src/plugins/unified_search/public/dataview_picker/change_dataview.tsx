/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import { css } from '@emotion/react';
import {
  EuiPopover,
  EuiHorizontalRule,
  EuiButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  useEuiTheme,
  useGeneratedHtmlId,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTourStep,
  EuiContextMenuPanelProps,
} from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import { IDataPluginServices } from '@kbn/data-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataViewPickerProps } from '.';
import { DataViewsList } from './dataview_list';
import { changeDataViewStyles } from './change_dataview.styles';

const hideAnnouncementsUISetting = 'hideAnnouncements';
const NEW_DATA_VIEW_MENU_STORAGE_KEY = 'data.newDataViewMenu';

const newMenuTourTitle = i18n.translate('unifiedSearch.query.dataViewMenu.newMenuTour.title', {
  defaultMessage: 'A better data view menu',
});

const newMenuTourDescription = i18n.translate(
  'unifiedSearch.query.dataViewMenu.newMenuTour.description',
  {
    defaultMessage:
      'This menu now offers all the tools you need to create, find, and edit your data views.',
  }
);

const newMenuTourDismissLabel = i18n.translate(
  'unifiedSearch.query.dataViewMenu.newMenuTour.dismissLabel',
  {
    defaultMessage: 'Got it',
  }
);

export function ChangeDataView({
  isMissingCurrent,
  currentDataViewId,
  onChangeDataView,
  onAddField,
  onDataViewCreated,
  trigger,
  selectableProps,
  showNewMenuTour = false,
}: DataViewPickerProps) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [dataViewsList, setDataViewsList] = useState<DataViewListItem[]>([]);
  const [triggerLabel, setTriggerLabel] = useState('');
  const kibana = useKibana<IDataPluginServices>();
  const { application, data, storage, uiSettings } = kibana.services;
  const styles = changeDataViewStyles({ fullWidth: trigger.fullWidth });
  const isHideAnnouncementSettingsOn = Boolean(uiSettings.get(hideAnnouncementsUISetting));

  const [isTourDismissed, setIsTourDismissed] = useState(() =>
    Boolean(storage.get(NEW_DATA_VIEW_MENU_STORAGE_KEY))
  );
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    if (showNewMenuTour && !isTourDismissed && !isHideAnnouncementSettingsOn) {
      setIsTourOpen(true);
    }
  }, [isHideAnnouncementSettingsOn, isTourDismissed, setIsTourOpen, showNewMenuTour]);

  const onTourDismiss = () => {
    storage.set(NEW_DATA_VIEW_MENU_STORAGE_KEY, true);
    setIsTourDismissed(true);
    setIsTourOpen(false);
  };

  // Create a reusable id to ensure search input is the first focused item in the popover even though it's not the first item
  const searchListInputId = useGeneratedHtmlId({ prefix: 'dataviewPickerListSearchInput' });

  useEffect(() => {
    const fetchDataViews = async () => {
      const dataViewsRefs = await data.dataViews.getIdsWithTitle();
      setDataViewsList(dataViewsRefs);
    };
    fetchDataViews();
  }, [data, currentDataViewId]);

  useEffect(() => {
    if (trigger.label) {
      setTriggerLabel(trigger.label);
    }
  }, [trigger.label]);

  const createTrigger = function () {
    const { label, title, 'data-test-subj': dataTestSubj, fullWidth, ...rest } = trigger;
    return (
      <EuiButton
        css={styles.trigger}
        data-test-subj={dataTestSubj}
        onClick={() => {
          setPopoverIsOpen(!isPopoverOpen);
          setIsTourOpen(false);
          // onTourDismiss(); TODO: Decide if opening the menu should also dismiss the tour
        }}
        color={isMissingCurrent ? 'danger' : 'primary'}
        iconSide="right"
        iconType="arrowDown"
        title={title}
        fullWidth={fullWidth}
        {...rest}
      >
        {triggerLabel}
      </EuiButton>
    );
  };

  const getPanelItems = () => {
    const panelItems: EuiContextMenuPanelProps['items'] = [];
    if (onAddField) {
      panelItems.push(
        <EuiContextMenuItem
          key="add"
          icon="indexOpen"
          data-test-subj="indexPattern-add-field"
          onClick={() => {
            setPopoverIsOpen(false);
            onAddField();
          }}
        >
          {i18n.translate('unifiedSearch.query.queryBar.indexPattern.addFieldButton', {
            defaultMessage: 'Add a field to this data view',
          })}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          key="manage"
          icon="indexSettings"
          data-test-subj="indexPattern-manage-field"
          onClick={() => {
            setPopoverIsOpen(false);
            application.navigateToApp('management', {
              path: `/kibana/indexPatterns/patterns/${currentDataViewId}`,
            });
          }}
        >
          {i18n.translate('unifiedSearch.query.queryBar.indexPattern.manageFieldButton', {
            defaultMessage: 'Manage this data view',
          })}
        </EuiContextMenuItem>,
        <EuiHorizontalRule margin="none" />
      );
    }
    panelItems.push(
      <DataViewsList
        dataViewsList={dataViewsList}
        onChangeDataView={(newId) => {
          onChangeDataView(newId);
          setPopoverIsOpen(false);
        }}
        currentDataViewId={currentDataViewId}
        selectableProps={selectableProps}
        searchListInputId={searchListInputId}
      />
    );

    if (onDataViewCreated) {
      panelItems.push(
        <EuiHorizontalRule margin="none" />,
        <EuiContextMenuItem
          css={css`
            color: ${euiTheme.colors.primaryText};
          `}
          data-test-subj="dataview-create-new"
          icon="plusInCircleFilled"
          onClick={() => {
            setPopoverIsOpen(false);
            onDataViewCreated();
          }}
        >
          {i18n.translate('unifiedSearch.query.queryBar.indexPattern.addNewDataView', {
            defaultMessage: 'Create a data view',
          })}
        </EuiContextMenuItem>
      );
    }

    return panelItems;
  };

  return (
    <EuiTourStep
      title={
        <>
          <EuiIcon type="bell" size="s" /> &nbsp; {newMenuTourTitle}
        </>
      }
      content={
        <EuiText css={styles.popoverContent}>
          <p>{newMenuTourDescription}</p>
        </EuiText>
      }
      isStepOpen={isTourOpen}
      onFinish={onTourDismiss}
      step={1}
      stepsTotal={1}
      footerAction={
        <EuiLink data-test-subj="dataViewPickerTourLink" onClick={onTourDismiss}>
          {newMenuTourDismissLabel}
        </EuiLink>
      }
      repositionOnScroll
      display="block"
    >
      <EuiPopover
        panelClassName="changeDataViewPopover"
        button={createTrigger()}
        panelProps={{
          ['data-test-subj']: 'changeDataViewPopover',
        }}
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverIsOpen(false)}
        panelPaddingSize="none"
        initialFocus={`#${searchListInputId}`}
        display="block"
        buffer={8}
      >
        <div css={styles.popoverContent}>
          <EuiContextMenuPanel size="s" items={getPanelItems()} />
        </div>
      </EuiPopover>
    </EuiTourStep>
  );
}

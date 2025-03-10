/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiPopover,
  EuiHorizontalRule,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  useEuiTheme,
  useGeneratedHtmlId,
  useIsWithinBreakpoints,
  EuiIcon,
  EuiText,
  EuiContextMenuPanelProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { IUnifiedSearchPluginServices } from '../types';
import { type DataViewPickerProps } from './data_view_picker';
import type { DataViewListItemEnhanced } from './dataview_list';
import adhoc from './assets/adhoc.svg';
import { changeDataViewStyles } from './change_dataview.styles';
import { DataViewSelector } from './data_view_selector';

const mapDataViewListItem = (
  dataView: DataView,
  partial: Partial<DataViewListItemEnhanced>
): DataViewListItemEnhanced => ({
  title: dataView.title,
  name: dataView.name,
  id: dataView.id!,
  type: dataView.type,
  ...partial,
});

const mapAdHocDataView = (adHocDataView: DataView) =>
  mapDataViewListItem(adHocDataView, { isAdhoc: true });

const mapManagedDataView = (managedDataView: DataView) =>
  mapDataViewListItem(managedDataView, { isManaged: true });

const shrinkableContainerCss = css`
  min-width: 0;
`;

export function ChangeDataView({
  isMissingCurrent,
  currentDataViewId,
  adHocDataViews,
  managedDataViews,
  savedDataViews,
  onChangeDataView,
  onAddField,
  onDataViewCreated,
  trigger,
  selectableProps,
  isDisabled,
  onEditDataView,
  onCreateDefaultAdHocDataView,
}: DataViewPickerProps) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [dataViewsList, setDataViewsList] = useState<DataViewListItemEnhanced[]>([]);

  const kibana = useKibana<IUnifiedSearchPluginServices>();
  const { application, data, dataViews, dataViewEditor } = kibana.services;

  const isMobile = useIsWithinBreakpoints(['xs']);

  const styles = changeDataViewStyles({
    fullWidth: trigger.fullWidth,
    dataViewsList,
    theme: euiTheme,
    isMobile,
  });

  // Create a reusable id to ensure search input is the first focused item in the popover even though it's not the first item
  const searchListInputId = useGeneratedHtmlId({ prefix: 'dataviewPickerListSearchInput' });

  useEffect(() => {
    const fetchDataViews = async () => {
      const savedDataViewRefs = savedDataViews
        ? savedDataViews
        : (await data.dataViews.getIdsWithTitle()) ?? [];
      const adHocDataViewRefs = adHocDataViews?.map(mapAdHocDataView) ?? [];
      const managedDataViewRefs = managedDataViews?.map(mapManagedDataView) ?? [];

      setDataViewsList([...savedDataViewRefs, ...adHocDataViewRefs, ...managedDataViewRefs]);
    };
    fetchDataViews();
  }, [data, currentDataViewId, adHocDataViews, savedDataViews, managedDataViews]);

  const isAdHocSelected = useMemo(() => {
    return adHocDataViews?.some((dataView) => dataView.id === currentDataViewId);
  }, [adHocDataViews, currentDataViewId]);

  const createTrigger = function () {
    const { label, title, 'data-test-subj': dataTestSubj, fullWidth, ...rest } = trigger;
    return (
      <EuiButtonEmpty
        css={styles.trigger}
        data-test-subj={dataTestSubj}
        onClick={() => {
          setPopoverIsOpen(!isPopoverOpen);
        }}
        color={isMissingCurrent ? 'danger' : 'text'}
        iconSide="right"
        iconType="arrowDown"
        title={trigger.label}
        disabled={isDisabled}
        textProps={{ className: 'eui-textTruncate' }}
        {...rest}
      >
        <>
          {/* we don't want to display the adHoc icon on text based mode */}
          {isAdHocSelected && (
            <EuiIcon
              type={adhoc}
              color="primary"
              css={css`
                margin-right: ${euiTheme.size.s};
              `}
            />
          )}
          {trigger.label}
        </>
      </EuiButtonEmpty>
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
        onEditDataView || dataViewEditor.userPermissions.editDataView() ? (
          <EuiContextMenuItem
            key="manage"
            icon="indexSettings"
            data-test-subj="indexPattern-manage-field"
            onClick={async () => {
              if (onEditDataView) {
                const dataView = await dataViews.get(currentDataViewId!);
                dataViewEditor.openEditor({
                  editData: dataView,
                  onSave: (updatedDataView) => {
                    onEditDataView(updatedDataView);
                  },
                });
              } else {
                application.navigateToApp('management', {
                  path: `/kibana/indexPatterns/patterns/${currentDataViewId}`,
                });
              }
              setPopoverIsOpen(false);
            }}
          >
            {i18n.translate('unifiedSearch.query.queryBar.indexPattern.manageFieldButton', {
              defaultMessage: 'Manage this data view',
            })}
          </EuiContextMenuItem>
        ) : (
          <React.Fragment key="empty" />
        ),
        <EuiHorizontalRule margin="none" key="dataviewActions-divider" />
      );
    }
    panelItems.push(
      <React.Fragment key="add-dataview">
        {onDataViewCreated && (
          <EuiFlexGroup
            alignItems="center"
            gutterSize="none"
            justifyContent="spaceBetween"
            responsive={false}
            css={css`
              margin: ${euiTheme.size.s};
              margin-bottom: 0;
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <h5>
                      {i18n.translate('unifiedSearch.query.queryBar.indexPattern.dataViewsLabel', {
                        defaultMessage: 'Data views',
                      })}
                    </h5>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => {
                  setPopoverIsOpen(false);
                  onDataViewCreated();
                }}
                size="xs"
                iconType="plusInCircleFilled"
                iconSide="left"
                data-test-subj="dataview-create-new"
              >
                {i18n.translate('unifiedSearch.query.queryBar.indexPattern.addNewDataView', {
                  defaultMessage: 'Create a data view',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <DataViewSelector
          currentDataViewId={currentDataViewId}
          searchListInputId={searchListInputId}
          dataViewsList={dataViewsList}
          selectableProps={selectableProps}
          setPopoverIsOpen={setPopoverIsOpen}
          onChangeDataView={async (newId) => {
            setPopoverIsOpen(false);
            onChangeDataView(newId);
          }}
          onCreateDefaultAdHocDataView={onCreateDefaultAdHocDataView}
        />
      </React.Fragment>
    );

    return panelItems;
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <>
        <EuiFlexItem grow={true} css={shrinkableContainerCss}>
          <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
            <EuiFlexItem
              grow={false}
              css={css`
                padding: 11px;
                border-radius: ${euiTheme.border.radius.small} 0 0 ${euiTheme.border.radius.small};
                background-color: ${euiTheme.colors.lightestShade};
                border: ${euiTheme.border.thin};
                border-right: 0;
              `}
            >
              {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.switcherLabelTitle', {
                defaultMessage: 'Data view',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={true} css={shrinkableContainerCss}>
              <EuiPopover
                panelClassName="changeDataViewPopover"
                button={createTrigger()}
                panelProps={{
                  ['data-test-subj']: 'changeDataViewPopover',
                }}
                isOpen={isPopoverOpen}
                closePopover={() => setPopoverIsOpen(false)}
                panelPaddingSize="none"
                initialFocus={`[id="${searchListInputId}"]`}
                display="block"
                buffer={8}
              >
                <div css={styles.popoverContent}>
                  <EuiContextMenuPanel size="s" items={getPanelItems()} />
                </div>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </>
    </EuiFlexGroup>
  );
}

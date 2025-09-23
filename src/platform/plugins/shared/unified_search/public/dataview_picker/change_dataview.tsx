/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { css } from '@emotion/react';
import type { EuiContextMenuPanelProps } from '@elastic/eui';
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

const mapAdHocDataView = (adHocDataView: DataView): DataViewListItemEnhanced => ({
  title: adHocDataView.title,
  name: adHocDataView.name,
  id: adHocDataView.id!,
  type: adHocDataView.type,
  isAdhoc: true,
  managed: adHocDataView.managed,
});

const shrinkableContainerCss = css`
  min-width: 0;
  flex-direction: row;
`;

export function ChangeDataView({
  isMissingCurrent,
  currentDataViewId,
  adHocDataViews,
  savedDataViews,
  onChangeDataView,
  onAddField,
  onDataViewCreated,
  trigger,
  selectableProps,
  isDisabled,
  onEditDataView,
  onCreateDefaultAdHocDataView,
  onClosePopover,
  getDataViewHelpText,
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

  const closePopover = useCallback(() => {
    setPopoverIsOpen(false);
    if (onClosePopover) {
      onClosePopover();
    }
  }, [onClosePopover]);

  useEffect(() => {
    const fetchDataViews = async () => {
      const savedDataViewRefs = savedDataViews
        ? savedDataViews
        : (await data.dataViews.getIdsWithTitle()) ?? [];
      const adHocDataViewRefs = adHocDataViews?.map(mapAdHocDataView) ?? [];
      setDataViewsList([...savedDataViewRefs, ...adHocDataViewRefs]);
    };

    fetchDataViews();
  }, [data, currentDataViewId, adHocDataViews, savedDataViews]);

  const isAdHocSelected = useMemo(() => {
    return adHocDataViews?.some((dataView) => dataView.id === currentDataViewId);
  }, [adHocDataViews, currentDataViewId]);

  const closeDataViewEditor = useRef<() => void | undefined>();

  useEffect(() => {
    return () => {
      // Make sure to close the editors when unmounting
      if (closeDataViewEditor.current) {
        closeDataViewEditor.current();
      }
    };
  }, []);

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
        size="s"
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
              size="s"
            />
          )}
          {trigger.label}
        </>
      </EuiButtonEmpty>
    );
  };
  const onDuplicate = useCallback(async () => {
    if (!currentDataViewId || !onDataViewCreated) {
      return;
    }
    const dataView = await dataViews.get(currentDataViewId);
    const editData = await dataViews.create({
      ...dataView.toSpec(),
      id: undefined,
      version: undefined,
      managed: false,
    });

    closeDataViewEditor.current = dataViewEditor.openEditor({
      editData,
      onSave: (newDataView) => {
        onDataViewCreated(newDataView);
      },
      allowAdHocDataView: true,
      isDuplicating: true,
    });
  }, [currentDataViewId, dataViews, dataViewEditor, onDataViewCreated]);

  const onEdit = useCallback(async () => {
    if (onEditDataView && currentDataViewId) {
      const dataView = await dataViews.get(currentDataViewId);
      closeDataViewEditor.current = dataViewEditor.openEditor({
        editData: dataView,
        onSave: (updatedDataView) => {
          onEditDataView(updatedDataView);
        },
        onDuplicate,
        getDataViewHelpText,
      });
    } else {
      application.navigateToApp('management', {
        path: `/kibana/indexPatterns/patterns/${currentDataViewId}`,
      });
    }
    closePopover();
  }, [
    currentDataViewId,
    dataViews,
    onEditDataView,
    dataViewEditor,
    application,
    closePopover,
    onDuplicate,
    getDataViewHelpText,
  ]);

  const onCreate = useCallback(() => {
    if (onDataViewCreated) {
      closeDataViewEditor.current = dataViewEditor.openEditor({
        onSave: (newDataView) => {
          onDataViewCreated(newDataView);
        },
        allowAdHocDataView: true,
      });
    }
    closePopover();
  }, [onDataViewCreated, dataViewEditor, closePopover]);

  const items = useMemo(() => {
    const panelItems: EuiContextMenuPanelProps['items'] = [];
    if (onAddField) {
      panelItems.push(
        <EuiContextMenuItem
          key="add"
          icon="indexOpen"
          data-test-subj="indexPattern-add-field"
          onClick={() => {
            closePopover();
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
            onClick={onEdit}
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
                onClick={onCreate}
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
            closePopover();
            onChangeDataView(newId);
          }}
          onCreateDefaultAdHocDataView={onCreateDefaultAdHocDataView}
        />
      </React.Fragment>
    );

    return panelItems;
  }, [
    closePopover,
    currentDataViewId,
    dataViewEditor,
    dataViewsList,
    euiTheme.size.s,
    onAddField,
    onChangeDataView,
    onCreateDefaultAdHocDataView,
    onCreate,
    onDataViewCreated,
    onEdit,
    onEditDataView,
    searchListInputId,
    selectableProps,
  ]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <>
        <EuiFlexItem grow={true} css={shrinkableContainerCss}>
          <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
            <EuiFlexItem
              grow={false}
              css={css`
                padding: 0 ${euiTheme.size.s};
                height: 100%;
                border-radius: ${euiTheme.border.radius.small} 0 0 ${euiTheme.border.radius.small};
                background-color: ${euiTheme.colors.lightestShade};
                border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
                border-right: 0;
                justify-content: center;
              `}
            >
              <EuiText size="s">
                {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.switcherLabelTitle', {
                  defaultMessage: 'Data view',
                })}
              </EuiText>
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
                css={{ inlineSize: '100%' }}
              >
                <div css={styles.popoverContent}>
                  <EuiContextMenuPanel size="s" items={items} />
                </div>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </>
    </EuiFlexGroup>
  );
}

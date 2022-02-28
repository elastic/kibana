/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import {
  EuiPopover,
  EuiHorizontalRule,
  EuiSelectable,
  EuiSelectableProps,
  EuiButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPanel,
} from '@elastic/eui';
import type { DataViewListItem } from 'src/plugins/data_views/public';
import { IDataPluginServices } from '../../';
import { useKibana } from '../../../../kibana_react/public';
import type { ChangeDataViewTriggerProps } from './index';

import './data_view_picker.scss';

const POPOVER_CONTENT_WIDTH = 280;

export function ChangeDataView({
  isMissingCurrent,
  currentDataViewId,
  onChangeDataView,
  onAddField,
  onDataViewCreated,
  trigger,
  selectableProps,
}: {
  trigger: ChangeDataViewTriggerProps;
  isMissingCurrent?: boolean;
  onChangeDataView: (newId: string) => void;
  onAddField?: () => void;
  onDataViewCreated?: () => void;
  currentDataViewId?: string;
  selectableProps?: EuiSelectableProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [dataViewsList, setDataViewsList] = useState<DataViewListItem[]>([]);
  const kibana = useKibana<IDataPluginServices>();
  const { application, data } = kibana.services;

  useEffect(() => {
    const fetchDataViews = async () => {
      const dataViewsRefs = await data.dataViews.getIdsWithTitle();
      setDataViewsList(dataViewsRefs);
    };
    fetchDataViews();
  }, [data]);

  // be careful to only add color with a value, otherwise it will fallbacks to "primary"
  const colorProp = isMissingCurrent
    ? {
        color: 'danger' as const,
      }
    : {};

  const createTrigger = function () {
    const { label, title, ...rest } = trigger;
    return (
      <EuiButton
        title={title}
        className="dataviewPicker__trigger"
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        fullWidth
        color={isMissingCurrent ? 'danger' : 'primary'}
        iconSide="right"
        iconType="arrowDown"
        {...colorProp}
        {...rest}
      >
        <strong>{label}</strong>
      </EuiButton>
    );
  };

  return (
    <>
      <EuiPopover
        panelClassName="changeDataViewPopover"
        button={createTrigger()}
        panelProps={{
          ['data-test-subj']: 'changeDataViewPopover',
        }}
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverIsOpen(false)}
        display="block"
        panelPaddingSize="s"
        ownFocus
      >
        <div style={{ width: POPOVER_CONTENT_WIDTH }}>
          {onAddField && (
            <>
              <EuiContextMenuPanel
                size="s"
                items={[
                  <EuiContextMenuItem
                    key="add"
                    icon="indexOpen"
                    data-test-subj="indexPattern-add-field"
                    onClick={() => {
                      setPopoverIsOpen(false);
                      onAddField();
                    }}
                  >
                    {i18n.translate('data.query.queryBar.indexPattern.addFieldButton', {
                      defaultMessage: 'Add field to data view...',
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
                    {i18n.translate('data.query.queryBar.indexPattern.manageFieldButton', {
                      defaultMessage: 'Manage data view fields...',
                    })}
                  </EuiContextMenuItem>,
                ]}
              />
              <EuiHorizontalRule margin="none" />
            </>
          )}
          <EuiSelectable<{
            key?: string;
            label: string;
            value?: string;
            checked?: 'on' | 'off' | undefined;
          }>
            {...selectableProps}
            searchable
            singleSelection="always"
            options={dataViewsList?.map(({ title, id }) => ({
              key: id,
              label: title,
              value: id,
              checked: id === currentDataViewId ? 'on' : undefined,
            }))}
            onChange={(choices) => {
              const choice = choices.find(({ checked }) => checked) as unknown as {
                value: string;
              };
              onChangeDataView(choice.value);
              setPopoverIsOpen(false);
            }}
            searchProps={{
              compressed: true,
              placeholder: i18n.translate('data.query.queryBar.indexPattern.findDataView', {
                defaultMessage: 'Find a data view',
              }),
              ...(selectableProps ? selectableProps.searchProps : undefined),
            }}
          >
            {(list, search) => (
              <EuiPanel color="transparent" paddingSize="s">
                {search}
                {list}
              </EuiPanel>
            )}
          </EuiSelectable>
          {onDataViewCreated && (
            <>
              <EuiHorizontalRule margin="none" />
              <EuiContextMenuPanel
                size="s"
                items={[
                  <EuiContextMenuItem
                    key="new"
                    icon="plusInCircleFilled"
                    onClick={() => {
                      setPopoverIsOpen(false);
                      onDataViewCreated();
                    }}
                  >
                    {i18n.translate('data.query.queryBar.indexPattern.addNewDataView', {
                      defaultMessage: 'New data view...',
                    })}
                  </EuiContextMenuItem>,
                ]}
              />
            </>
          )}
        </div>
      </EuiPopover>
    </>
  );
}

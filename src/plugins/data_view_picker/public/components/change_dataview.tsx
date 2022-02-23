/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import type { DataView, DataViewListItem } from 'src/plugins/data_views/public';
import { useKibana } from '../shared_imports';
import type { DataViewPickerContext, ChangeDataViewTriggerProps } from '../types';

export function ChangeDataView({
  isMissingCurrent,
  indexPatternId,
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
  onDataViewCreated?: (dataView: DataView) => void;
  indexPatternId?: string;
  selectableProps?: EuiSelectableProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [dataViewsList, setDataViewsList] = useState<DataViewListItem[]>([]);
  const kibana = useKibana<DataViewPickerContext>();
  const { application, dataViewFieldEditor, dataViews, dataViewEditor } = kibana.services;
  const editPermission = dataViewFieldEditor.userPermissions.editIndexPattern();
  const closeFieldEditor = useRef<() => void | undefined>();
  const closeDataViewEditor = useRef<() => void | undefined>();

  useEffect(() => {
    const fetchDataViews = async () => {
      const dataViewsRefs = await dataViews.getIdsWithTitle();
      setDataViewsList(dataViewsRefs);
    };
    fetchDataViews();
  }, [dataViews]);

  useEffect(() => {
    return () => {
      // Make sure to close the editors when unmounting
      if (closeFieldEditor.current) {
        closeFieldEditor.current();
      }
      if (closeDataViewEditor.current) {
        closeDataViewEditor.current();
      }
    };
  }, []);

  const editField = useMemo(
    () =>
      editPermission
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            if (indexPatternId) {
              const indexPatternInstance = await dataViews.get(indexPatternId);
              closeFieldEditor.current = dataViewFieldEditor.openEditor({
                ctx: {
                  dataView: indexPatternInstance,
                },
                fieldName,
                onSave: async () => {
                  onAddField?.();
                },
              });
            }
          }
        : undefined,
    [dataViews, dataViewFieldEditor, indexPatternId, editPermission, onAddField]
  );

  const addField = useMemo(
    () => (editPermission && editField ? () => editField(undefined, 'add') : undefined),
    [editField, editPermission]
  );

  const createNewDataView = useCallback(() => {
    const indexPatternFieldEditPermission = dataViewEditor.userPermissions.editDataView;
    if (!indexPatternFieldEditPermission) {
      return;
    }
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: async (dataView) => {
        onDataViewCreated?.(dataView);
      },
    });
  }, [dataViewEditor, onDataViewCreated]);

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
        panelClassName="lnsChangeDataViewPopover"
        button={createTrigger()}
        panelProps={{
          ['data-test-subj']: 'lnsChangeDataViewPopover',
        }}
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverIsOpen(false)}
        display="block"
        panelPaddingSize="s"
        ownFocus
      >
        <div>
          <EuiContextMenuPanel
            size="s"
            items={[
              <EuiContextMenuItem
                key="add"
                icon="indexOpen"
                data-test-subj="indexPattern-add-field"
                onClick={() => {
                  setPopoverIsOpen(false);
                  addField?.();
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
                    path: `/kibana/indexPatterns/patterns/${indexPatternId}`,
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
              checked: id === indexPatternId ? 'on' : undefined,
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
        </div>
        <EuiHorizontalRule margin="none" />
        <EuiContextMenuPanel
          size="s"
          items={[
            <EuiContextMenuItem
              key="new"
              icon="plusInCircleFilled"
              onClick={() => {
                setPopoverIsOpen(false);
                createNewDataView?.();
              }}
            >
              {i18n.translate('data.query.queryBar.indexPattern.addNewDataView', {
                defaultMessage: 'New data view...',
              })}
            </EuiContextMenuItem>,
          ]}
        />
      </EuiPopover>
    </>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDiscoverServices } from '../../../../utils/use_discover_services';
import type { DataView } from '../../../../../../data_views/public';

export interface DiscoverIndexPatternManagementProps {
  /**
   * Currently selected index pattern
   */
  selectedIndexPattern?: DataView;
  /**
   * Read from the Fields API
   */
  useNewFieldsApi?: boolean;
  /**
   * Callback to execute on edit field action
   * @param fieldName
   */
  editField: (fieldName?: string) => void;

  /**
   * Callback to execute on create new data action
   */
  createNewDataView: () => void;
}

export function DiscoverIndexPatternManagement(props: DiscoverIndexPatternManagementProps) {
  const { dataViewFieldEditor, core } = useDiscoverServices();
  const { useNewFieldsApi, selectedIndexPattern, editField, createNewDataView } = props;
  const dataViewEditPermission = dataViewFieldEditor?.userPermissions.editIndexPattern();
  const canEditDataViewField = !!dataViewEditPermission && useNewFieldsApi;
  const [isAddIndexPatternFieldPopoverOpen, setIsAddIndexPatternFieldPopoverOpen] = useState(false);

  if (!useNewFieldsApi || !selectedIndexPattern || !canEditDataViewField) {
    return null;
  }

  const addField = () => {
    editField(undefined);
  };

  return (
    <EuiPopover
      panelPaddingSize="none"
      isOpen={isAddIndexPatternFieldPopoverOpen}
      closePopover={() => {
        setIsAddIndexPatternFieldPopoverOpen(false);
      }}
      ownFocus
      data-test-subj="discover-addRuntimeField-popover"
      button={
        <EuiButtonIcon
          color="text"
          iconType="boxesHorizontal"
          data-test-subj="discoverIndexPatternActions"
          aria-label={i18n.translate('discover.fieldChooser.indexPatterns.actionsPopoverLabel', {
            defaultMessage: 'Data view settings',
          })}
          onClick={() => {
            setIsAddIndexPatternFieldPopoverOpen(!isAddIndexPatternFieldPopoverOpen);
          }}
        />
      }
    >
      <EuiContextMenuPanel
        size="m"
        title="Data view"
        items={[
          <EuiContextMenuItem
            key="add"
            icon="indexOpen"
            data-test-subj="indexPattern-add-field"
            onClick={() => {
              setIsAddIndexPatternFieldPopoverOpen(false);
              addField();
            }}
          >
            {i18n.translate('discover.fieldChooser.indexPatterns.addFieldButton', {
              defaultMessage: 'Add field',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="manage"
            icon="indexSettings"
            data-test-subj="indexPattern-manage-field"
            onClick={() => {
              setIsAddIndexPatternFieldPopoverOpen(false);
              core.application.navigateToApp('management', {
                path: `/kibana/indexPatterns/patterns/${props.selectedIndexPattern?.id}`,
              });
            }}
          >
            {i18n.translate('discover.fieldChooser.indexPatterns.manageFieldButton', {
              defaultMessage: 'Manage settings',
            })}
          </EuiContextMenuItem>,
          <EuiHorizontalRule style={{ margin: '0px' }} />,
          <EuiContextMenuItem
            key="new"
            icon="plusInCircleFilled"
            data-test-subj="dataview-create-new"
            onClick={() => {
              setIsAddIndexPatternFieldPopoverOpen(false);
              createNewDataView();
            }}
          >
            {i18n.translate('discover.fieldChooser.dataViews.createNewDataView', {
              defaultMessage: 'Create new data view',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { MouseEvent } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isBoolean } from 'lodash';

interface AddDeleteButtonsProps {
  addTooltip: string;
  deleteTooltip: string;
  cloneTooltip: string;
  activatePanelTooltip: string;
  deactivatePanelTooltip: string;
  isPanelActive?: boolean;
  disableAdd?: boolean;
  disableDelete?: boolean;
  responsive?: boolean;
  testSubj: string;
  togglePanelActivation?: () => void;
  onClone?: () => void;
  onAdd?: () => void;
  onDelete?: (event: MouseEvent) => void;
}

export function AddDeleteButtons(props: AddDeleteButtonsProps) {
  const { testSubj } = props;
  const createDelete = () => {
    if (props.disableDelete) {
      return null;
    }
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={props.deleteTooltip}>
          <EuiButtonIcon
            data-test-subj={`${testSubj}DeleteBtn`}
            aria-label={props.deleteTooltip}
            color="danger"
            iconType="trash"
            onClick={props.onDelete}
          />
        </EuiToolTip>
      </EuiFlexItem>
    );
  };
  const createAdd = () => {
    if (props.disableAdd) {
      return null;
    }
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={props.addTooltip}>
          <EuiButtonIcon
            data-test-subj={`${testSubj}AddBtn`}
            aria-label={props.addTooltip}
            iconType="plusInCircle"
            onClick={props.onAdd}
          />
        </EuiToolTip>
      </EuiFlexItem>
    );
  };

  const createClone = () => {
    let cloneBtn = null;

    if (props.onClone && !props.disableAdd) {
      cloneBtn = (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={props.cloneTooltip}>
            <EuiButtonIcon
              data-test-subj={`${testSubj}CloneBtn`}
              aria-label={props.cloneTooltip}
              iconType="copy"
              onClick={props.onClone}
            />
          </EuiToolTip>
        </EuiFlexItem>
      );
    }

    return cloneBtn;
  };

  const createActivatePanel = () => {
    let activatePanelBtn = null;

    if (isBoolean(props.isPanelActive)) {
      const tooltip = props.isPanelActive
        ? props.deactivatePanelTooltip
        : props.activatePanelTooltip;
      const iconType = props.isPanelActive ? 'eye' : 'eyeClosed';

      activatePanelBtn = (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={tooltip}>
            <EuiButtonIcon
              data-test-subj={`${testSubj}ActivatePanelBtn`}
              aria-label={tooltip}
              iconType={iconType}
              onClick={props.togglePanelActivation}
            />
          </EuiToolTip>
        </EuiFlexItem>
      );
    }

    return activatePanelBtn;
  };

  const deleteBtn = createDelete();
  const addBtn = createAdd();
  const cloneBtn = createClone();
  const activatePanelBtn = createActivatePanel();

  return (
    <EuiFlexGroup gutterSize="s" responsive={props.responsive} justifyContent="flexEnd">
      {activatePanelBtn}
      {cloneBtn}
      {addBtn}
      {deleteBtn}
    </EuiFlexGroup>
  );
}

AddDeleteButtons.defaultProps = {
  testSubj: 'Add',
  activeTooltip: i18n.translate('visTypeTimeseries.addDeleteButtons.addButtonDefaultTooltip', {
    defaultMessage: 'Add',
  }),
  addTooltip: i18n.translate('visTypeTimeseries.addDeleteButtons.addButtonDefaultTooltip', {
    defaultMessage: 'Add',
  }),
  deleteTooltip: i18n.translate('visTypeTimeseries.addDeleteButtons.deleteButtonDefaultTooltip', {
    defaultMessage: 'Delete',
  }),
  cloneTooltip: i18n.translate('visTypeTimeseries.addDeleteButtons.cloneButtonDefaultTooltip', {
    defaultMessage: 'Clone',
  }),
  activatePanelTooltip: i18n.translate('visTypeTimeseries.addDeleteButtons.reEnableTooltip', {
    defaultMessage: 'Re-enable',
  }),
  deactivatePanelTooltip: i18n.translate(
    'visTypeTimeseries.addDeleteButtons.temporarilyDisableTooltip',
    {
      defaultMessage: 'Temporarily Disable',
    }
  ),
};

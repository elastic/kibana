/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

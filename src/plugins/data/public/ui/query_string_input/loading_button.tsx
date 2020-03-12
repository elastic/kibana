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

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

// @ts-ignore
import { EuiButton, EuiContextMenu, EuiPopover, EuiSuperUpdateButton } from '@elastic/eui';

export enum LoadingButtonAction {
  ActionAbortAll,
  ActionRunBeyondTimeout,
  ActionRefresh,
  ActionUpdate,
}

interface Props {
  isDirty: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  onClick: (action: LoadingButtonAction) => void;
}

export function LoadingButton(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = () => {
    setIsOpen(false);
  };

  const panels = {
    id: 0,
    items: [
      {
        name: i18n.translate('data.searchBar.cancelRequest', {
          defaultMessage: 'Cancel request',
        }),
        icon: 'stop',
        onClick: () => {
          props.onClick(LoadingButtonAction.ActionAbortAll);
          closePopover();
        },
        'data-test-subj': 'searchBarCancelRequest',
      },
      {
        name: i18n.translate('data.searchBar.runBeyondTimeout', {
          defaultMessage: 'Run beyond timeout',
        }),
        icon: 'play',
        onClick: () => {
          props.onClick(LoadingButtonAction.ActionRunBeyondTimeout);
          closePopover();
        },
        'data-test-subj': 'searchBarRunBeyondTimeout',
      },
    ],
  };

  if (props.isLoading) {
    const button = (
      <EuiButton
        iconType="arrowDown"
        iconSide="right"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        // isLoading={true}
      >
        Loading
      </EuiButton>
    );

    return (
      <EuiPopover
        id="contextMenu"
        button={button}
        isOpen={isOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        withTitle
        anchorPosition="downLeft"
      >
        <EuiContextMenu initialPanelId={0} panels={[panels]} />
      </EuiPopover>
    );
  } else {
    return (
      <EuiSuperUpdateButton
        needsUpdate={props.isDirty}
        isDisabled={props.isDisabled}
        onClick={() => {
          props.onClick(
            props.isDirty ? LoadingButtonAction.ActionUpdate : LoadingButtonAction.ActionRefresh
          );
        }}
        data-test-subj="querySubmitButton"
      />
    );
  }
}

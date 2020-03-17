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

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { EuiWrappingPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiIcon } from '@elastic/eui';
import { EuiContextMenu } from '@elastic/eui';
import { NavAction } from '../types';

let isOpen = false;

const container = document.createElement('div');

const onClose = () => {
  ReactDOM.unmountComponentAtNode(container);
  isOpen = false;
};

export function AddPanelPopover({
  anchorElement,
  addExisting,
  addNew,
}: {
  anchorElement: HTMLElement;
  addNew: NavAction;
  addExisting: NavAction;
}) {
  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;

  const panels = [
    {
      id: 0,
      title: i18n.translate('kbn.dashboard.topNav.addPopover.title', {
        defaultMessage: 'Add a panel',
      }),
      items: [
        {
          name: i18n.translate('kbn.dashboard.topNav.addPopover.addExisting', {
            defaultMessage: 'Select existing',
          }),
          icon: <EuiIcon type="folderOpen" size="m" />,
          onClick: addExisting,
          'data-test-subj': 'dashboardAddPopoverExisting',
        },
        {
          name: i18n.translate('kbn.dashboard.topNav.addPopover.addNew', {
            defaultMessage: 'Add new',
          }),
          icon: <EuiIcon type="plusInCircle" size="m" />,
          onClick: addNew,
          'data-test-subj': 'dashboardAddPopoverNew',
        },
      ],
    },
  ];

  document.body.appendChild(container);
  const element = (
    <I18nProvider>
      <EuiWrappingPopover
        id="popover"
        button={anchorElement}
        isOpen={true}
        closePopover={onClose}
        anchorPosition="downLeft"
        panelPaddingSize="none"
        withTitle
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiWrappingPopover>
    </I18nProvider>
  );
  ReactDOM.render(element, container);
}

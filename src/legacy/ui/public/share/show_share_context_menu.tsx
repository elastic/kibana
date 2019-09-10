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

import { EuiWrappingPopover } from '@elastic/eui';
import { I18nContext } from 'ui/i18n';
import { ShareContextMenu } from './components/share_context_menu';
import { ShareActionProvider } from './share_action';

let isOpen = false;

const container = document.createElement('div');

const onClose = () => {
  ReactDOM.unmountComponentAtNode(container);
  isOpen = false;
};

interface ShowProps {
  actionType: string;
  anchorElement: any;
  allowEmbed: boolean;
  allowPermalink: boolean;
  allowShortUrl: boolean;
  getUnhashableStates: () => object[];
  objectId?: string;
  objectType: string;
  shareContextMenuExtensions?: ShareActionProvider[];
  sharingData: any;
  isDirty: boolean;
}

export function showShareContextMenu({
  actionType,
  allowEmbed,
  allowPermalink,
  allowShortUrl,
  anchorElement,
  getUnhashableStates,
  isDirty,
  objectId,
  objectType,
  shareContextMenuExtensions,
  sharingData,
}: ShowProps) {
  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;

  document.body.appendChild(container);
  const element = (
    <I18nContext>
      <EuiWrappingPopover
        id="sharePopover"
        button={anchorElement}
        isOpen={true}
        closePopover={onClose}
        panelPaddingSize="none"
        withTitle
        anchorPosition="downLeft"
      >
        <ShareContextMenu
          actionType={actionType}
          allowEmbed={allowEmbed}
          allowPermalink={allowPermalink}
          allowShortUrl={allowShortUrl}
          getUnhashableStates={getUnhashableStates}
          isDirty={isDirty}
          objectId={objectId}
          objectType={objectType}
          shareContextMenuExtensions={shareContextMenuExtensions}
          sharingData={sharingData}
          onClose={onClose}
        />
      </EuiWrappingPopover>
    </I18nContext>
  );
  ReactDOM.render(element, container);
}

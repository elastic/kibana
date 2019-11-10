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

import { CoreStart, HttpStart } from 'kibana/public';
import { ShareContextMenu } from '../components/share_context_menu';
import { ShareAction, ShowProps } from '../types';
import { ShareActionsRegistryStart } from './share_actions_registry';

export class ShareActionsContextMenu {
  private isOpen = false;

  private container = document.createElement('div');

  start(core: CoreStart, shareRegistry: ShareActionsRegistryStart) {
    return {
      showShareContextMenu: (props: ShowProps) => {
        const shareActions = shareRegistry.getActions({ ...props, onClose: this.onClose });
        this.showShareContextMenu({
          ...props,
          shareActions,
          post: core.http.post,
          basePath: core.http.basePath.get(),
        });
      },
    };
  }

  private onClose = () => {
    ReactDOM.unmountComponentAtNode(this.container);
    this.isOpen = false;
  };

  private showShareContextMenu({
    anchorElement,
    allowEmbed,
    allowShortUrl,
    objectId,
    objectType,
    sharingData,
    isDirty,
    shareActions,
    shareableUrl,
    post,
    basePath,
  }: ShowProps & { shareActions: ShareAction[]; post: HttpStart['post']; basePath: string }) {
    if (this.isOpen) {
      this.onClose();
      return;
    }

    this.isOpen = true;

    document.body.appendChild(this.container);
    const element = (
      <I18nProvider>
        <EuiWrappingPopover
          id="sharePopover"
          button={anchorElement}
          isOpen={true}
          closePopover={this.onClose}
          panelPaddingSize="none"
          withTitle
          anchorPosition="downLeft"
        >
          <ShareContextMenu
            allowEmbed={allowEmbed}
            allowShortUrl={allowShortUrl}
            objectId={objectId}
            objectType={objectType}
            shareActions={shareActions}
            sharingData={sharingData}
            shareableUrl={shareableUrl}
            isDirty={isDirty}
            onClose={this.onClose}
            post={post}
            basePath={basePath}
          />
        </EuiWrappingPopover>
      </I18nProvider>
    );
    ReactDOM.render(element, this.container);
  }
}
export type ShareActionsContextMenuStart = ReturnType<ShareActionsContextMenu['start']>;

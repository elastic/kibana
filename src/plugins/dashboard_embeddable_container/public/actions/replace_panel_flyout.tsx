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

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { GetEmbeddableFactories } from 'src/plugins/embeddable/public';
import { DashboardPanelState } from '../embeddable';
import { NotificationsStart, Toast } from '../../../../core/public';
import { IContainer, IEmbeddable, EmbeddableInput, EmbeddableOutput } from '../embeddable_plugin';

interface Props {
  container: IContainer;
  savedObjectsFinder: React.ComponentType<any>;
  onClose: () => void;
  notifications: NotificationsStart;
  panelToRemove: IEmbeddable<EmbeddableInput, EmbeddableOutput>;
  getEmbeddableFactories: GetEmbeddableFactories;
}

export class ReplacePanelFlyout extends React.Component<Props> {
  private lastToast: Toast = {
    id: 'panelReplaceToast',
  };

  constructor(props: Props) {
    super(props);
  }

  public showToast = (name: string) => {
    // To avoid the clutter of having toast messages cover flyout
    // close previous toast message before creating a new one
    if (this.lastToast) {
      this.props.notifications.toasts.remove(this.lastToast);
    }

    this.lastToast = this.props.notifications.toasts.addSuccess({
      title: i18n.translate(
        'dashboardEmbeddableContainer.addPanel.savedObjectAddedToContainerSuccessMessageTitle',
        {
          defaultMessage: '{savedObjectName} was added',
          values: {
            savedObjectName: name,
          },
        }
      ),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
  };

  public onReplacePanel = async (id: string, type: string, name: string) => {
    const originalPanels = this.props.container.getInput().panels;
    const filteredPanels = { ...originalPanels };

    const nnw = (filteredPanels[this.props.panelToRemove.id] as DashboardPanelState).gridData.w;
    const nnh = (filteredPanels[this.props.panelToRemove.id] as DashboardPanelState).gridData.h;
    const nnx = (filteredPanels[this.props.panelToRemove.id] as DashboardPanelState).gridData.x;
    const nny = (filteredPanels[this.props.panelToRemove.id] as DashboardPanelState).gridData.y;

    // add the new view
    const newObj = await this.props.container.addSavedObjectEmbeddable(type, id);

    const finalPanels = this.props.container.getInput().panels;
    (finalPanels[newObj.id] as DashboardPanelState).gridData.w = nnw;
    (finalPanels[newObj.id] as DashboardPanelState).gridData.h = nnh;
    (finalPanels[newObj.id] as DashboardPanelState).gridData.x = nnx;
    (finalPanels[newObj.id] as DashboardPanelState).gridData.y = nny;

    // delete the old view
    delete finalPanels[this.props.panelToRemove.id];

    // apply changes
    this.props.container.updateInput(finalPanels);
    this.props.container.reload();

    this.showToast(name);
    this.props.onClose();
  };

  public render() {
    const SavedObjectFinder = this.props.savedObjectsFinder;
    const savedObjectsFinder = (
      <SavedObjectFinder
        noItemsMessage={i18n.translate(
          'dashboardEmbeddableContainer.addPanel.noMatchingObjectsMessage',
          {
            defaultMessage: 'No matching objects found.',
          }
        )}
        savedObjectMetaData={[...this.props.getEmbeddableFactories()]
          .filter(
            embeddableFactory =>
              Boolean(embeddableFactory.savedObjectMetaData) && !embeddableFactory.isContainerType
          )
          .map(({ savedObjectMetaData }) => savedObjectMetaData as any)}
        showFilter={true}
        onChoose={this.onReplacePanel}
      />
    );

    const panelToReplace = 'Replace panel ' + this.props.panelToRemove.getTitle() + ' with:';

    return (
      <EuiFlyout ownFocus onClose={this.props.onClose} data-test-subj="dashboardReplacePanel">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <span>{panelToReplace}</span>
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{savedObjectsFinder}</EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}

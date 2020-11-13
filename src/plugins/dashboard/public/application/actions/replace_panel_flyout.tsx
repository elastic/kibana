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
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { NotificationsStart, Toast } from 'src/core/public';
import { DashboardPanelState } from '../embeddable';
import {
  EmbeddableInput,
  EmbeddableOutput,
  EmbeddableStart,
  IContainer,
  IEmbeddable,
  SavedObjectEmbeddableInput,
} from '../../embeddable_plugin';

interface Props {
  container: IContainer;
  savedObjectsFinder: React.ComponentType<any>;
  onClose: () => void;
  notifications: NotificationsStart;
  panelToRemove: IEmbeddable<EmbeddableInput, EmbeddableOutput>;
  getEmbeddableFactories: EmbeddableStart['getEmbeddableFactories'];
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
      title: i18n.translate('dashboard.addPanel.savedObjectAddedToContainerSuccessMessageTitle', {
        defaultMessage: '{savedObjectName} was added',
        values: {
          savedObjectName: name,
        },
      }),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
  };

  public onReplacePanel = async (savedObjectId: string, type: string, name: string) => {
    const { panelToRemove, container } = this.props;
    const { w, h, x, y } = (container.getInput().panels[
      panelToRemove.id
    ] as DashboardPanelState).gridData;

    const { id } = await container.addNewEmbeddable<SavedObjectEmbeddableInput>(type, {
      savedObjectId,
    });

    const { [panelToRemove.id]: omit, ...panels } = container.getInput().panels;

    container.updateInput({
      panels: {
        ...panels,
        [id]: {
          ...panels[id],
          gridData: {
            ...(panels[id] as DashboardPanelState).gridData,
            w,
            h,
            x,
            y,
          },
        } as DashboardPanelState,
      },
    });
    container.reload();

    this.showToast(name);
    this.props.onClose();
  };

  public render() {
    const SavedObjectFinder = this.props.savedObjectsFinder;
    const savedObjectsFinder = (
      <SavedObjectFinder
        noItemsMessage={i18n.translate('dashboard.addPanel.noMatchingObjectsMessage', {
          defaultMessage: 'No matching objects found.',
        })}
        savedObjectMetaData={[...this.props.getEmbeddableFactories()]
          .filter(
            (embeddableFactory) =>
              Boolean(embeddableFactory.savedObjectMetaData) && !embeddableFactory.isContainerType
          )
          .map(({ savedObjectMetaData }) => savedObjectMetaData as any)}
        showFilter={true}
        onChoose={this.onReplacePanel}
      />
    );

    const panelToReplace = 'Replace panel ' + this.props.panelToRemove.getTitle() + ' with:';

    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <span>{panelToReplace}</span>
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{savedObjectsFinder}</EuiFlyoutBody>
      </>
    );
  }
}

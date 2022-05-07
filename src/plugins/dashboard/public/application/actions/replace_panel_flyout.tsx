/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { NotificationsStart, Toast } from '@kbn/core/public';
import { DashboardPanelState } from '../embeddable';
import {
  EmbeddableInput,
  EmbeddableOutput,
  EmbeddableStart,
  IContainer,
  IEmbeddable,
  SavedObjectEmbeddableInput,
} from '../../services/embeddable';
import { dashboardReplacePanelAction } from '../../dashboard_strings';

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
      title: dashboardReplacePanelAction.getSuccessMessage(name),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
  };

  public onReplacePanel = async (savedObjectId: string, type: string, name: string) => {
    const { panelToRemove, container } = this.props;
    const { w, h, x, y } = (container.getInput().panels[panelToRemove.id] as DashboardPanelState)
      .gridData;

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
        noItemsMessage={dashboardReplacePanelAction.getNoMatchingObjectsMessage()}
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

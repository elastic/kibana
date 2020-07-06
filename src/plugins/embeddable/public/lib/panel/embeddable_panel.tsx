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
import { EuiContextMenuPanelDescriptor, EuiPanel, htmlIdGenerator } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import { Subscription } from 'rxjs';
import { buildContextMenuForActions, UiActionsService, Action } from '../ui_actions';
import { CoreStart, OverlayStart } from '../../../../../core/public';
import { toMountPoint } from '../../../../kibana_react/public';

import { Start as InspectorStartContract } from '../inspector';
import {
  CONTEXT_MENU_TRIGGER,
  PANEL_BADGE_TRIGGER,
  PANEL_NOTIFICATION_TRIGGER,
  EmbeddableContext,
} from '../triggers';
import { IEmbeddable, EmbeddableOutput, EmbeddableError } from '../embeddables/i_embeddable';
import { ViewMode } from '../types';

import { RemovePanelAction } from './panel_header/panel_actions';
import { AddPanelAction } from './panel_header/panel_actions/add_panel/add_panel_action';
import { CustomizePanelTitleAction } from './panel_header/panel_actions/customize_title/customize_panel_action';
import { PanelHeader } from './panel_header/panel_header';
import { InspectPanelAction } from './panel_header/panel_actions/inspect_panel_action';
import { EditPanelAction } from '../actions';
import { CustomizePanelModal } from './panel_header/panel_actions/customize_title/customize_panel_modal';
import { EmbeddableStart } from '../../plugin';
import { EmbeddableErrorLabel } from './embeddable_error_label';
import { EmbeddableStateTransfer } from '..';

const sortByOrderField = (
  { order: orderA }: { order?: number },
  { order: orderB }: { order?: number }
) => (orderB || 0) - (orderA || 0);

const removeById = (disabledActions: string[]) => ({ id }: { id: string }) =>
  disabledActions.indexOf(id) === -1;

interface Props {
  embeddable: IEmbeddable<any, any>;
  getActions: UiActionsService['getTriggerCompatibleActions'];
  getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
  getAllEmbeddableFactories: EmbeddableStart['getEmbeddableFactories'];
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  application: CoreStart['application'];
  inspector: InspectorStartContract;
  SavedObjectFinder: React.ComponentType<any>;
  stateTransfer?: EmbeddableStateTransfer;
  hideHeader?: boolean;
}

interface State {
  panels: EuiContextMenuPanelDescriptor[];
  focusedPanelIndex?: string;
  viewMode: ViewMode;
  hidePanelTitles: boolean;
  closeContextMenu: boolean;
  badges: Array<Action<EmbeddableContext>>;
  notifications: Array<Action<EmbeddableContext>>;
  loading?: boolean;
  error?: EmbeddableError;
}

export class EmbeddablePanel extends React.Component<Props, State> {
  private embeddableRoot: React.RefObject<HTMLDivElement>;
  private parentSubscription?: Subscription;
  private subscription: Subscription = new Subscription();
  private mounted: boolean = false;
  private generateId = htmlIdGenerator();

  constructor(props: Props) {
    super(props);
    const { embeddable } = this.props;
    const viewMode = embeddable.getInput().viewMode
      ? embeddable.getInput().viewMode
      : ViewMode.EDIT;
    const hidePanelTitles = embeddable.parent
      ? Boolean(embeddable.parent.getInput().hidePanelTitles)
      : false;

    this.state = {
      panels: [],
      viewMode,
      hidePanelTitles,
      closeContextMenu: false,
      badges: [],
      notifications: [],
    };

    this.embeddableRoot = React.createRef();
  }

  private async refreshBadges() {
    let badges = await this.props.getActions(PANEL_BADGE_TRIGGER, {
      embeddable: this.props.embeddable,
    });
    if (!this.mounted) return;

    const { disabledActions } = this.props.embeddable.getInput();
    if (disabledActions) {
      badges = badges.filter((badge) => disabledActions.indexOf(badge.id) === -1);
    }

    this.setState({
      badges,
    });
  }

  private async refreshNotifications() {
    let notifications = await this.props.getActions(PANEL_NOTIFICATION_TRIGGER, {
      embeddable: this.props.embeddable,
    });
    if (!this.mounted) return;

    const { disabledActions } = this.props.embeddable.getInput();
    if (disabledActions) {
      notifications = notifications.filter((badge) => disabledActions.indexOf(badge.id) === -1);
    }

    this.setState({
      notifications,
    });
  }

  public UNSAFE_componentWillMount() {
    this.mounted = true;
    const { embeddable } = this.props;
    const { parent } = embeddable;

    this.subscription.add(
      embeddable.getInput$().subscribe(async () => {
        if (this.mounted) {
          this.setState({
            viewMode: embeddable.getInput().viewMode
              ? embeddable.getInput().viewMode
              : ViewMode.EDIT,
          });

          this.refreshBadges();
          this.refreshNotifications();
        }
      })
    );

    if (parent) {
      this.parentSubscription = parent.getInput$().subscribe(async () => {
        if (this.mounted && parent) {
          this.setState({
            hidePanelTitles: Boolean(parent.getInput().hidePanelTitles),
          });

          this.refreshBadges();
          this.refreshNotifications();
        }
      });
    }
  }

  public componentWillUnmount() {
    this.mounted = false;
    this.subscription.unsubscribe();
    if (this.parentSubscription) {
      this.parentSubscription.unsubscribe();
    }
    this.props.embeddable.destroy();
  }

  public onFocus = (focusedPanelIndex: string) => {
    this.setState({ focusedPanelIndex });
  };

  public onBlur = (blurredPanelIndex: string) => {
    if (this.state.focusedPanelIndex === blurredPanelIndex) {
      this.setState({ focusedPanelIndex: undefined });
    }
  };

  public render() {
    const viewOnlyMode = this.state.viewMode === ViewMode.VIEW;
    const classes = classNames('embPanel', {
      'embPanel--editing': !viewOnlyMode,
      'embPanel--loading': this.state.loading,
    });

    const contentAttrs: { [key: string]: boolean } = {};
    if (this.state.loading) contentAttrs['data-loading'] = true;
    if (this.state.error) contentAttrs['data-error'] = true;

    const title = this.props.embeddable.getTitle();
    const headerId = this.generateId();
    return (
      <EuiPanel
        className={classes}
        data-test-subj="embeddablePanel"
        paddingSize="none"
        role="figure"
        aria-labelledby={headerId}
      >
        {!this.props.hideHeader && (
          <PanelHeader
            getActionContextMenuPanel={this.getActionContextMenuPanel}
            hidePanelTitles={this.state.hidePanelTitles}
            isViewMode={viewOnlyMode}
            closeContextMenu={this.state.closeContextMenu}
            title={title}
            badges={this.state.badges}
            notifications={this.state.notifications}
            embeddable={this.props.embeddable}
            headerId={headerId}
          />
        )}
        <EmbeddableErrorLabel error={this.state.error} />
        <div className="embPanel__content" ref={this.embeddableRoot} {...contentAttrs} />
      </EuiPanel>
    );
  }

  public componentDidMount() {
    if (this.embeddableRoot.current) {
      this.subscription.add(
        this.props.embeddable.getOutput$().subscribe((output: EmbeddableOutput) => {
          this.setState({
            error: output.error,
            loading: output.loading,
          });
        })
      );
      this.props.embeddable.render(this.embeddableRoot.current);
    }
  }

  closeMyContextMenuPanel = () => {
    if (this.mounted) {
      this.setState({ closeContextMenu: true }, () => {
        if (this.mounted) {
          this.setState({ closeContextMenu: false });
        }
      });
    }
  };

  private getActionContextMenuPanel = async () => {
    let regularActions = await this.props.getActions(CONTEXT_MENU_TRIGGER, {
      embeddable: this.props.embeddable,
    });

    const { disabledActions } = this.props.embeddable.getInput();
    if (disabledActions) {
      const removeDisabledActions = removeById(disabledActions);
      regularActions = regularActions.filter(removeDisabledActions);
    }

    const createGetUserData = (overlays: OverlayStart) =>
      async function getUserData(context: { embeddable: IEmbeddable }) {
        return new Promise<{ title: string | undefined }>((resolve) => {
          const session = overlays.openModal(
            toMountPoint(
              <CustomizePanelModal
                embeddable={context.embeddable}
                updateTitle={(title) => {
                  session.close();
                  resolve({ title });
                }}
              />
            ),
            {
              'data-test-subj': 'customizePanel',
            }
          );
        });
      };

    // These actions are exposed on the context menu for every embeddable, they bypass the trigger
    // registry.
    const extraActions: Array<Action<EmbeddableContext>> = [
      new CustomizePanelTitleAction(createGetUserData(this.props.overlays)),
      new AddPanelAction(
        this.props.getEmbeddableFactory,
        this.props.getAllEmbeddableFactories,
        this.props.overlays,
        this.props.notifications,
        this.props.SavedObjectFinder
      ),
      new InspectPanelAction(this.props.inspector),
      new RemovePanelAction(),
      new EditPanelAction(
        this.props.getEmbeddableFactory,
        this.props.application,
        this.props.stateTransfer
      ),
    ];

    const sortedActions = [...regularActions, ...extraActions].sort(sortByOrderField);

    return await buildContextMenuForActions({
      actions: sortedActions,
      actionContext: { embeddable: this.props.embeddable },
      closeMenu: this.closeMyContextMenuPanel,
    });
  };
}

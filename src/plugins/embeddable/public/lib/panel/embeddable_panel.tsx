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
import {
  buildContextMenuForActions,
  TGetActionsCompatibleWithTrigger,
  IAction,
} from '../ui_actions';
import { CoreStart, OverlayStart } from '../../../../../core/public';
import { toMountPoint } from '../../../../kibana_react/public';

import { Start as InspectorStartContract } from '../inspector';
import { CONTEXT_MENU_TRIGGER, PANEL_BADGE_TRIGGER } from '../triggers';
import { IEmbeddable } from '../embeddables/i_embeddable';
import { ViewMode, GetEmbeddableFactory, GetEmbeddableFactories } from '../types';

import { RemovePanelAction } from './panel_header/panel_actions';
import { AddPanelAction } from './panel_header/panel_actions/add_panel/add_panel_action';
import { CustomizePanelTitleAction } from './panel_header/panel_actions/customize_title/customize_panel_action';
import { PanelHeader } from './panel_header/panel_header';
import { InspectPanelAction } from './panel_header/panel_actions/inspect_panel_action';
import { EditPanelAction } from '../actions';
import { CustomizePanelModal } from './panel_header/panel_actions/customize_title/customize_panel_modal';

interface Props {
  embeddable: IEmbeddable<any, any>;
  getActions: TGetActionsCompatibleWithTrigger;
  getEmbeddableFactory: GetEmbeddableFactory;
  getAllEmbeddableFactories: GetEmbeddableFactories;
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  inspector: InspectorStartContract;
  SavedObjectFinder: React.ComponentType<any>;
  hideHeader?: boolean;
}

interface State {
  panels: EuiContextMenuPanelDescriptor[];
  focusedPanelIndex?: string;
  viewMode: ViewMode;
  hidePanelTitles: boolean;
  closeContextMenu: boolean;
  badges: IAction[];
}

export class EmbeddablePanel extends React.Component<Props, State> {
  private embeddableRoot: React.RefObject<HTMLDivElement>;
  private parentSubscription?: Subscription;
  private subscription?: Subscription;
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
    };

    this.embeddableRoot = React.createRef();
  }

  private async refreshBadges() {
    let badges: IAction[] = await this.props.getActions(PANEL_BADGE_TRIGGER, {
      embeddable: this.props.embeddable,
    });
    if (!this.mounted) return;

    const { disabledActions } = this.props.embeddable.getInput();
    if (disabledActions) {
      badges = badges.filter(badge => disabledActions.indexOf(badge.id) === -1);
    }

    this.setState({
      badges,
    });
  }

  public UNSAFE_componentWillMount() {
    this.mounted = true;
    const { embeddable } = this.props;
    const { parent } = embeddable;

    this.subscription = embeddable.getInput$().subscribe(async () => {
      if (this.mounted) {
        this.setState({
          viewMode: embeddable.getInput().viewMode ? embeddable.getInput().viewMode : ViewMode.EDIT,
        });

        this.refreshBadges();
      }
    });

    if (parent) {
      this.parentSubscription = parent.getInput$().subscribe(async () => {
        if (this.mounted && parent) {
          this.setState({
            hidePanelTitles: Boolean(parent.getInput().hidePanelTitles),
          });

          this.refreshBadges();
        }
      });
    }
  }

  public componentWillUnmount() {
    this.mounted = false;
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
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
    });
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
            embeddable={this.props.embeddable}
            headerId={headerId}
          />
        )}
        <div className="embPanel__content" ref={this.embeddableRoot} />
      </EuiPanel>
    );
  }

  public componentDidMount() {
    if (this.embeddableRoot.current) {
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
    let actions = await this.props.getActions(CONTEXT_MENU_TRIGGER, {
      embeddable: this.props.embeddable,
    });

    const { disabledActions } = this.props.embeddable.getInput();
    if (disabledActions) {
      actions = actions.filter(action => disabledActions.indexOf(action.id) === -1);
    }

    const createGetUserData = (overlays: OverlayStart) =>
      async function getUserData(context: { embeddable: IEmbeddable }) {
        return new Promise<{ title: string | undefined }>(resolve => {
          const session = overlays.openModal(
            toMountPoint(
              <CustomizePanelModal
                embeddable={context.embeddable}
                updateTitle={title => {
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
    const extraActions: Array<IAction<{ embeddable: IEmbeddable }>> = [
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
      new EditPanelAction(this.props.getEmbeddableFactory),
    ];

    const sorted = actions.concat(extraActions).sort((a: IAction, b: IAction) => {
      const bOrder = b.order || 0;
      const aOrder = a.order || 0;
      return bOrder - aOrder;
    });

    return await buildContextMenuForActions({
      actions: sorted,
      actionContext: { embeddable: this.props.embeddable },
      closeMenu: this.closeMyContextMenuPanel,
    });
  };
}

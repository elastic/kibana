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
import { EuiContextMenuPanelDescriptor, EuiPanel } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import { Subscription } from 'rxjs';
import { CoreStart } from '../../../../../../../../core/public';
import { buildContextMenuForActions } from '../context_menu_actions';

import { CONTEXT_MENU_TRIGGER } from '../triggers';
import { IEmbeddable } from '../embeddables/i_embeddable';
import {
  ViewMode,
  GetActionsCompatibleWithTrigger,
  GetEmbeddableFactory,
  GetEmbeddableFactories,
} from '../types';

import { RemovePanelAction } from './panel_header/panel_actions';
import { AddPanelAction } from './panel_header/panel_actions/add_panel/add_panel_action';
import { CustomizePanelTitleAction } from './panel_header/panel_actions/customize_title/customize_panel_action';
import { PanelHeader } from './panel_header/panel_header';
import { InspectPanelAction } from './panel_header/panel_actions/inspect_panel_action';
import { EditPanelAction, Action, ActionContext } from '../actions';
import { CustomizePanelModal } from './panel_header/panel_actions/customize_title/customize_panel_modal';
import { Start as InspectorStartContract } from '../../../../../../../../plugins/inspector/public';

interface Props {
  embeddable: IEmbeddable<any, any>;
  getActions: GetActionsCompatibleWithTrigger;
  getEmbeddableFactory: GetEmbeddableFactory;
  getAllEmbeddableFactories: GetEmbeddableFactories;
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  inspector: InspectorStartContract;
  SavedObjectFinder: React.ComponentType<any>;
}

interface State {
  panels: EuiContextMenuPanelDescriptor[];
  focusedPanelIndex?: string;
  viewMode: ViewMode;
  hidePanelTitles: boolean;
  closeContextMenu: boolean;
}

export class EmbeddablePanel extends React.Component<Props, State> {
  private embeddableRoot: React.RefObject<HTMLDivElement>;
  private parentSubscription?: Subscription;
  private subscription?: Subscription;
  private mounted: boolean = false;
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
    };

    this.embeddableRoot = React.createRef();
  }

  public componentWillMount() {
    this.mounted = true;
    const { embeddable } = this.props;
    const { parent } = embeddable;

    this.subscription = embeddable.getInput$().subscribe(async () => {
      if (this.mounted) {
        this.setState({
          viewMode: embeddable.getInput().viewMode ? embeddable.getInput().viewMode : ViewMode.EDIT,
        });
      }
    });

    if (parent) {
      this.parentSubscription = parent.getInput$().subscribe(async () => {
        if (this.mounted && parent) {
          this.setState({
            hidePanelTitles: Boolean(parent.getInput().hidePanelTitles),
          });
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
    return (
      <EuiPanel className={classes} data-test-subj="embeddablePanel" paddingSize="none">
        <PanelHeader
          getActionContextMenuPanel={this.getActionContextMenuPanel}
          hidePanelTitles={this.state.hidePanelTitles}
          isViewMode={viewOnlyMode}
          closeContextMenu={this.state.closeContextMenu}
          title={title}
        />
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
    const actions = await this.props.getActions(CONTEXT_MENU_TRIGGER, {
      embeddable: this.props.embeddable,
    });

    const createGetUserData = (overlays: CoreStart['overlays']) =>
      async function getUserData(context: ActionContext) {
        return new Promise<{ title: string | undefined }>(resolve => {
          const session = overlays.openModal(
            <CustomizePanelModal
              embeddable={context.embeddable}
              updateTitle={title => {
                session.close();
                resolve({ title });
              }}
            />,
            {
              'data-test-subj': 'customizePanel',
            }
          );
        });
      };

    // These actions are exposed on the context menu for every embeddable, they bypass the trigger
    // registry.
    const extraActions = [
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

    const sorted = actions.concat(extraActions).sort((a: Action, b: Action) => {
      return b.order - a.order;
    });

    return await buildContextMenuForActions({
      actions: sorted,
      actionContext: { embeddable: this.props.embeddable },
      closeMenu: this.closeMyContextMenuPanel,
    });
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiPanel, htmlIdGenerator } from '@elastic/eui';
import classNames from 'classnames';
import deepEqual from 'fast-deep-equal';
import React from 'react';
import { Subscription } from 'rxjs';
import type { CoreStart } from '../../../../../core/public/types';
import type { OverlayStart } from '../../../../../core/public/overlays/overlay_service';
import type { Start as InspectorStartContract } from '../../../../inspector/public/plugin';
import { toMountPoint } from '../../../../kibana_react/public/util/to_mount_point';
import type { Action } from '../../../../ui_actions/public/actions/action';
import { buildContextMenuForActions } from '../../../../ui_actions/public/context_menu/build_eui_context_menu_panels';
import { UiActionsService } from '../../../../ui_actions/public/service/ui_actions_service';
import type { UsageCollectionStart } from '../../../../usage_collection/public/plugin';
import type { EmbeddableInput } from '../../../common/types';
import { ViewMode } from '../../../common/types';
import type { EmbeddableStart } from '../../plugin';
import { EditPanelAction } from '../actions/edit_panel_action';
import { ErrorEmbeddable } from '../embeddables/error_embeddable';
import type { EmbeddableError, EmbeddableOutput, IEmbeddable } from '../embeddables/i_embeddable';
import { EmbeddableStateTransfer } from '../state_transfer/embeddable_state_transfer';
import type { EmbeddableContext } from '../triggers/triggers';
import {
  contextMenuTrigger,
  CONTEXT_MENU_TRIGGER,
  PANEL_BADGE_TRIGGER,
  PANEL_NOTIFICATION_TRIGGER,
} from '../triggers/triggers';
import { EmbeddableErrorLabel } from './embeddable_error_label';
import { AddPanelAction } from './panel_header/panel_actions/add_panel/add_panel_action';
import { CustomizePanelTitleAction } from './panel_header/panel_actions/customize_title/customize_panel_action';
import { CustomizePanelModal } from './panel_header/panel_actions/customize_title/customize_panel_modal';
import { InspectPanelAction } from './panel_header/panel_actions/inspect_panel_action';
import { RemovePanelAction } from './panel_header/panel_actions/remove_panel_action';
import { PanelHeader } from './panel_header/panel_header';

const sortByOrderField = (
  { order: orderA }: { order?: number },
  { order: orderB }: { order?: number }
) => (orderB || 0) - (orderA || 0);

const removeById = (disabledActions: string[]) => ({ id }: { id: string }) =>
  disabledActions.indexOf(id) === -1;

interface Props {
  embeddable: IEmbeddable<EmbeddableInput, EmbeddableOutput>;
  getActions: UiActionsService['getTriggerCompatibleActions'];
  getEmbeddableFactory?: EmbeddableStart['getEmbeddableFactory'];
  getAllEmbeddableFactories?: EmbeddableStart['getEmbeddableFactories'];
  overlays?: CoreStart['overlays'];
  notifications?: CoreStart['notifications'];
  application?: CoreStart['application'];
  inspector?: InspectorStartContract;
  SavedObjectFinder?: React.ComponentType<any>;
  stateTransfer?: EmbeddableStateTransfer;
  hideHeader?: boolean;
  actionPredicate?: (actionId: string) => boolean;
  reportUiCounter?: UsageCollectionStart['reportUiCounter'];
  showShadow?: boolean;
  showBadges?: boolean;
  showNotifications?: boolean;
}

interface State {
  panels: EuiContextMenuPanelDescriptor[];
  universalActions: PanelUniversalActions;
  focusedPanelIndex?: string;
  viewMode: ViewMode;
  hidePanelTitle: boolean;
  closeContextMenu: boolean;
  badges: Array<Action<EmbeddableContext>>;
  notifications: Array<Action<EmbeddableContext>>;
  loading?: boolean;
  error?: EmbeddableError;
  errorEmbeddable?: ErrorEmbeddable;
}

interface InspectorPanelAction {
  inspectPanel: InspectPanelAction;
}

interface BasePanelActions {
  customizePanelTitle: CustomizePanelTitleAction;
  addPanel: AddPanelAction;
  inspectPanel: InspectPanelAction;
  removePanel: RemovePanelAction;
  editPanel: EditPanelAction;
}

const emptyObject = {};
type EmptyObject = typeof emptyObject;

type PanelUniversalActions =
  | BasePanelActions
  | InspectorPanelAction
  | (BasePanelActions & InspectorPanelAction)
  | EmptyObject;

export class EmbeddablePanel extends React.Component<Props, State> {
  private embeddableRoot: React.RefObject<HTMLDivElement>;
  private parentSubscription?: Subscription;
  private subscription: Subscription = new Subscription();
  private mounted: boolean = false;
  private generateId = htmlIdGenerator();

  constructor(props: Props) {
    super(props);
    const { embeddable } = this.props;
    const viewMode = embeddable.getInput().viewMode ?? ViewMode.EDIT;
    const hidePanelTitle =
      Boolean(embeddable.parent?.getInput()?.hidePanelTitles) ||
      Boolean(embeddable.getInput()?.hidePanelTitles);

    this.state = {
      universalActions: this.getUniversalActions(),
      panels: [],
      viewMode,
      hidePanelTitle,
      closeContextMenu: false,
      badges: [],
      notifications: [],
    };

    this.embeddableRoot = React.createRef();
  }

  private async refreshBadges() {
    if (!this.mounted) {
      return;
    }
    if (this.props.showBadges === false) {
      return;
    }
    let badges = await this.props.getActions(PANEL_BADGE_TRIGGER, {
      embeddable: this.props.embeddable,
    });

    const { disabledActions } = this.props.embeddable.getInput();
    if (disabledActions) {
      badges = badges.filter((badge) => disabledActions.indexOf(badge.id) === -1);
    }

    if (!deepEqual(this.state.badges, badges)) {
      this.setState({
        badges,
      });
    }
  }

  private async refreshNotifications() {
    if (!this.mounted) {
      return;
    }
    if (this.props.showNotifications === false) {
      return;
    }
    let notifications = await this.props.getActions(PANEL_NOTIFICATION_TRIGGER, {
      embeddable: this.props.embeddable,
    });

    const { disabledActions } = this.props.embeddable.getInput();
    if (disabledActions) {
      notifications = notifications.filter((badge) => disabledActions.indexOf(badge.id) === -1);
    }

    if (!deepEqual(this.state.notifications, notifications)) {
      this.setState({
        notifications,
      });
    }
  }

  public UNSAFE_componentWillMount() {
    this.mounted = true;
    const { embeddable } = this.props;
    const { parent } = embeddable;

    this.subscription.add(
      embeddable.getInput$().subscribe(async () => {
        if (this.mounted) {
          this.setState({
            viewMode: embeddable.getInput().viewMode ?? ViewMode.EDIT,
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
            hidePanelTitle:
              Boolean(embeddable.parent?.getInput()?.hidePanelTitles) ||
              Boolean(embeddable.getInput()?.hidePanelTitles),
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
    if (this.state.errorEmbeddable) {
      this.state.errorEmbeddable.destroy();
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
        data-test-embeddable-id={this.props.embeddable.id}
        paddingSize="none"
        role="figure"
        aria-labelledby={headerId}
        hasShadow={this.props.showShadow}
      >
        {!this.props.hideHeader && (
          <PanelHeader
            getActionContextMenuPanel={this.getActionContextMenuPanel}
            hidePanelTitle={this.state.hidePanelTitle}
            isViewMode={viewOnlyMode}
            customizeTitle={
              'customizePanelTitle' in this.state.universalActions
                ? this.state.universalActions.customizePanelTitle
                : undefined
            }
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
        this.props.embeddable.getOutput$().subscribe(
          (output: EmbeddableOutput) => {
            this.setState({
              error: output.error,
              loading: output.loading,
            });
          },
          (error) => {
            if (this.embeddableRoot.current) {
              const errorEmbeddable = new ErrorEmbeddable(error, { id: this.props.embeddable.id });
              errorEmbeddable.render(this.embeddableRoot.current);
              this.setState({ errorEmbeddable });
            }
          }
        )
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

  private getUniversalActions = (): PanelUniversalActions => {
    let actions = {};
    if (this.props.inspector) {
      actions = {
        inspectPanel: new InspectPanelAction(this.props.inspector),
      };
    }
    if (
      !this.props.getEmbeddableFactory ||
      !this.props.getAllEmbeddableFactories ||
      !this.props.overlays ||
      !this.props.notifications ||
      !this.props.SavedObjectFinder ||
      !this.props.application
    ) {
      return actions;
    }

    const createGetUserData = (overlays: OverlayStart) =>
      async function getUserData(context: { embeddable: IEmbeddable }) {
        return new Promise<{ title: string | undefined; hideTitle?: boolean }>((resolve) => {
          const session = overlays.openModal(
            toMountPoint(
              <CustomizePanelModal
                embeddable={context.embeddable}
                updateTitle={(title, hideTitle) => {
                  session.close();
                  resolve({ title, hideTitle });
                }}
                cancel={() => session.close()}
              />
            ),
            {
              'data-test-subj': 'customizePanel',
            }
          );
        });
      };

    // Universal actions are exposed on the context menu for every embeddable, they bypass the trigger
    // registry.
    return {
      ...actions,
      customizePanelTitle: new CustomizePanelTitleAction(createGetUserData(this.props.overlays)),
      addPanel: new AddPanelAction(
        this.props.getEmbeddableFactory,
        this.props.getAllEmbeddableFactories,
        this.props.overlays,
        this.props.notifications,
        this.props.SavedObjectFinder,
        this.props.reportUiCounter
      ),
      removePanel: new RemovePanelAction(),
      editPanel: new EditPanelAction(
        this.props.getEmbeddableFactory,
        this.props.application,
        this.props.stateTransfer
      ),
    };
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

    let sortedActions = regularActions
      .concat(Object.values(this.state.universalActions || {}) as Array<Action<object>>)
      .sort(sortByOrderField);

    if (this.props.actionPredicate) {
      sortedActions = sortedActions.filter(({ id }) => this.props.actionPredicate!(id));
    }

    return await buildContextMenuForActions({
      actions: sortedActions.map((action) => ({
        action,
        context: { embeddable: this.props.embeddable },
        trigger: contextMenuTrigger,
      })),
      closeMenu: this.closeMyContextMenuPanel,
    });
  };
}

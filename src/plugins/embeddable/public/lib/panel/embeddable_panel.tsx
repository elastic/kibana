/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiContextMenuPanelDescriptor, EuiPanel, htmlIdGenerator } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import { Subscription } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import { CoreStart, OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { buildContextMenuForActions, UiActionsService, Action } from '../ui_actions';

import { Start as InspectorStartContract } from '../inspector';
import {
  CONTEXT_MENU_TRIGGER,
  PANEL_BADGE_TRIGGER,
  PANEL_NOTIFICATION_TRIGGER,
  EmbeddableContext,
  contextMenuTrigger,
} from '../triggers';
import {
  IEmbeddable,
  EmbeddableOutput,
  EmbeddableError,
  EmbeddableInput,
} from '../embeddables/i_embeddable';
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
import { EmbeddableStateTransfer, ErrorEmbeddable } from '..';

const sortByOrderField = (
  { order: orderA }: { order?: number },
  { order: orderB }: { order?: number }
) => (orderB || 0) - (orderA || 0);

const removeById =
  (disabledActions: string[]) =>
  ({ id }: { id: string }) =>
    disabledActions.indexOf(id) === -1;

/**
 * Embeddable container may provide information about its environment,
 * Use it for drilling down data that is static or doesn't have to be reactive,
 * otherwise prefer passing data with input$
 * */
export interface EmbeddableContainerContext {
  /**
   * Current app's path including query and hash starting from {appId}
   */
  getCurrentPath?: () => string;
}

interface Props {
  embeddable: IEmbeddable<EmbeddableInput, EmbeddableOutput>;

  /**
   * Ordinal number of the embeddable in the container, used as a
   * "title" when the panel has no title, i.e. "Panel {index}".
   */
  index?: number;

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
  containerContext?: EmbeddableContainerContext;
  theme: ThemeServiceStart;
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
    const viewOnlyMode = [ViewMode.VIEW, ViewMode.PRINT].includes(this.state.viewMode);
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
            index={this.props.index}
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
    const createGetUserData = (overlays: OverlayStart, theme: ThemeServiceStart) =>
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
              />,
              { theme$: theme.theme$ }
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
      customizePanelTitle: new CustomizePanelTitleAction(
        createGetUserData(this.props.overlays, this.props.theme)
      ),
      addPanel: new AddPanelAction(
        this.props.getEmbeddableFactory,
        this.props.getAllEmbeddableFactories,
        this.props.overlays,
        this.props.notifications,
        this.props.SavedObjectFinder,
        this.props.theme,
        this.props.reportUiCounter
      ),
      removePanel: new RemovePanelAction(),
      editPanel: new EditPanelAction(
        this.props.getEmbeddableFactory,
        this.props.application,
        this.props.stateTransfer,
        this.props.containerContext?.getCurrentPath
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

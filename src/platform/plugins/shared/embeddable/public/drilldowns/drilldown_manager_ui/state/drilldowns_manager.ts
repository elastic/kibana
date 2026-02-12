/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, map } from 'rxjs';
import type { ToastsStart } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { Trigger } from '@kbn/ui-actions-plugin/public';
import type { DrilldownFactory, DrilldownTemplate } from '../types';
import {
  toastDrilldownCreated,
  toastDrilldownsCRUDError,
  txtDefaultTitle,
  toastDrilldownDeleted,
  toastDrilldownsDeleted,
  toastDrilldownEdited,
} from './i18n';
import { DrilldownManager } from './drilldown_manager';
import { useTableItems } from '../hooks/use_table_items';
import type { DrilldownState } from '../../../../server/drilldowns/types';
import type { HasDrilldowns } from '../../types';

const helloMessageStorageKey = `drilldowns:hidWelcomeMessage`;

export type DrilldownsManagerDeps = HasDrilldowns & {
  /**
   * List of registered drilldowns
   */
  factories: DrilldownFactory[];

  /**
   * Initial screen which Drilldown Manager should display when it first opens.
   * Afterwards the state of the currently visible screen is controlled by the
   * Drilldown Manager.
   *
   * Possible values of the route:
   *
   * - `/create` --- opens with "Create new" tab selected.
   * - `/new` --- opens with the "Create new" tab selected showing new drilldown form.
   * - `/manage` --- opens with selected "Manage" tab.
   * - `/manage/yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy` --- opens in edit mode where
   *   drilldown with ID `yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy` is being edited.
   */
  initialRoute?: string;

  /**
   * Callback called when drilldown flyout should be closed.
   */
  onClose: () => void;

  /**
   * Drilldown setup context, i.e. context from open_context_menu trigger
   */
  setupContext: object;

  /**
   * List of possible triggers in current context
   */
  triggers: string[];

  /**
   * List of drilldown templates, which will be displayed to user for fast
   * drilldown creation flow.
   */
  templates?: DrilldownTemplate[];

  /**
   * Whether to close the drilldown flyout after a drilldown was created
   */
  closeAfterCreate?: boolean;

  /**
   * Trigger getter from UI Actions trigger registry.
   */
  getTrigger: (triggerId: string) => Trigger;

  /**
   * Implementation of local storage interface for persisting user preferences,
   * e.g. user can dismiss the welcome message.
   */
  storage: IStorageWrapper;

  /**
   * Services for displaying user toast notifications.
   */
  toastService: ToastsStart;

  /**
   * Link to drilldowns user facing docs on corporate website.
   */
  docsLink?: string;

  /**
   * Link to trigger picker user facing docs on corporate website.
   */
  triggerPickerDocsLink?: string;
};

/**
 * An instance of this class holds all the state necessary for Drilldown
 * Manager. It also holds all the necessary controllers to change the state.
 *
 * `<DrilldownManager>` and other container components access this state using
 * the `useDrilldownsManager()` React hook:
 *
 * ```ts
 * const drilldowns = useDrilldownsManager();
 * ```
 */
export class DrilldownsManager {
  /**
   * Title displayed at the top of <DrilldownManager> flyout.
   */
  private readonly title$ = new BehaviorSubject<React.ReactNode>(txtDefaultTitle);

  /**
   * Footer displayed at the bottom of <DrilldownManager> flyout.
   */
  private readonly footer$ = new BehaviorSubject<React.ReactNode>(null);

  /**
   * Route inside Drilldown Manager flyout that is displayed to the user. Some
   * available routes are:
   *
   * - `['create']`
   * - `['new']`
   * - `['new', 'dashboard_drilldown']`
   * - `['manage']`
   * - `['manage', 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy']`
   */
  public readonly route$: BehaviorSubject<string[]>;

  /**
   * Whether a drilldowns welcome message should be displayed to the user at
   * the very top of the drilldowns manager flyout.
   */
  public readonly hideWelcomeMessage$: BehaviorSubject<boolean>;

  /**
   * Drilldown manager for each drilldown type used for new drilldown creation, so when user
   * switches between drilldown types the configuration of the previous
   * drilldown is preserved.
   */
  public readonly drilldownManagers = new Map<string, DrilldownManager>();

  /**
   * Whether user can unlock more drilldown types if they subscribe to a higher
   * license tier.
   */
  public readonly canUnlockMoreDrilldowns: boolean;

  /**
   * Used to show cloning success notification.
   */
  public lastCloneRecord: null | { time: number; templateIds: string[] } = null;

  constructor(public readonly deps: DrilldownsManagerDeps) {
    const hideWelcomeMessage = deps.storage.get(helloMessageStorageKey);
    this.hideWelcomeMessage$ = new BehaviorSubject<boolean>(hideWelcomeMessage ?? false);
    this.canUnlockMoreDrilldowns = deps.factories.some(
      ({ isLicenseCompatible }) => !isLicenseCompatible
    );

    let { initialRoute = '' } = deps;
    if (!initialRoute) initialRoute = 'manage';
    else if (initialRoute[0] === '/') initialRoute = initialRoute.substr(1);
    this.route$ = new BehaviorSubject(initialRoute.split('/'));
  }

  /**
   * Set flyout main heading text.
   * @param title New title.
   */
  public setTitle(title: React.ReactNode) {
    this.title$.next(title);
  }

  /**
   * Set the new flyout footer that renders at the very bottom of the Drilldown
   * Manager flyout.
   * @param footer New title.
   */
  public setFooter(footer: React.ReactNode) {
    this.footer$.next(footer);
  }

  /**
   * Set the flyout main heading back to its default state.
   */
  public resetTitle() {
    this.setTitle(txtDefaultTitle);
  }

  /**
   * Change the screen of Drilldown Manager.
   */
  public setRoute(route: string[]): void {
    if (route[0] === 'manage') this.deps.closeAfterCreate = false;
    this.route$.next(route);
  }

  /**
   * Callback called to hide drilldowns welcome message, and remember in local
   * storage that user opted to hide this message.
   */
  public readonly hideWelcomeMessage = (): void => {
    this.hideWelcomeMessage$.next(true);
    this.deps.storage.set(helloMessageStorageKey, true);
  };

  /**
   * Select a different drilldown.
   */
  public setDrilldownFactory(nextFactory: undefined | DrilldownFactory): void {
    if (!nextFactory) {
      const route = this.route$.getValue();
      if (route[0] === 'new' && route.length > 1) this.setRoute(['new']);
      return;
    }

    if (!this.drilldownManagers.has(nextFactory.type)) {
      const drilldown = new DrilldownManager({
        factory: nextFactory,
        triggers: this.deps.triggers,
        initialState: {
          ...nextFactory.getInitialState(),
          label: nextFactory.displayName,
        },
        // placeContext: this.deps.placeContext || {},
      });
      this.drilldownManagers.set(nextFactory.type, drilldown);
    }

    this.route$.next(['new', nextFactory.type]);
  }

  /**
   * Close the drilldown flyout.
   */
  public readonly close = (): void => {
    this.deps.onClose();
  };

  /**
   * Get state object of the drilldown which is currently being created.
   */
  public getDrilldownManager(): undefined | DrilldownManager {
    const [, type] = this.route$.getValue();
    return this.drilldownManagers.get(type);
  }

  /**
   * Called when user presses "Create drilldown" button to save the
   * currently edited drilldown.
   */
  public async createDrilldown(): Promise<void> {
    const { drilldowns$, setDrilldowns, toastService } = this.deps;
    const drilldown = this.getDrilldownManager();

    if (!drilldown) return;

    const serializedDrilldown = drilldown.serialize();

    try {
      setDrilldowns([...drilldowns$.getValue(), serializedDrilldown]);
      toastService.addSuccess({
        title: toastDrilldownCreated.title(serializedDrilldown.label),
        text: toastDrilldownCreated.text,
      });
      this.drilldownManagers.delete(serializedDrilldown.type);
      if (this.deps.closeAfterCreate) {
        this.deps.onClose();
      } else {
        this.setRoute(['manage']);
      }
    } catch (error) {
      toastService.addError(error, {
        title: toastDrilldownsCRUDError,
      });
      throw error;
    }
  }

  /**
   * Deletes a list of drilldowns and shows toast notifications to the user.
   *
   * @param ids Drilldown IDs.
   */
  public readonly onDelete = (ids: string[]) => {
    const { drilldowns$, setDrilldowns, toastService } = this.deps;
    try {
      setDrilldowns([...drilldowns$.getValue().filter(({ actionId }) => !ids.includes(actionId))]);
      this.deps.toastService.addSuccess(
        ids.length === 1
          ? {
              title: toastDrilldownDeleted.title,
              text: toastDrilldownDeleted.text,
            }
          : {
              title: toastDrilldownsDeleted.title(ids.length),
              text: toastDrilldownsDeleted.text,
            }
      );
    } catch (error) {
      toastService.addError(error, {
        title: toastDrilldownsCRUDError,
      });
    }
  };

  /**
   * Clone a list of selected templates.
   */
  public readonly onCloneTemplates = async (templateIds: string[]) => {
    const { drilldowns$, setDrilldowns, templates } = this.deps;
    if (!templates) return;

    const clonedDrilldowns = templateIds
      .map((templateId) => {
        const template = templates.find(({ id }) => id === templateId);
        return template?.drilldownState;
      })
      .filter(Boolean) as DrilldownState[];

    if (clonedDrilldowns.length) {
      setDrilldowns([...drilldowns$.getValue(), ...clonedDrilldowns]);
    }

    this.lastCloneRecord = {
      time: Date.now(),
      templateIds,
    };
    this.setRoute(['manage']);
  };

  /**
   * Checks if drilldown with such a name already exists.
   */
  private hasDrilldownWithName(name: string): boolean {
    return this.deps.drilldowns$.getValue().some(({ label }) => label === name);
  }

  /**
   * Picks a unique name for the cloned drilldown. Adds "(copy)", "(copy 1)",
   * "(copy 2)", etc. if drilldown with such name already exists.
   */
  private pickName(name: string): string {
    if (this.hasDrilldownWithName(name)) {
      const matches = name.match(/(.*) (\(copy[^\)]*\))/);
      if (matches) name = matches[1];
      for (let i = 0; i < 100; i++) {
        const proposedName = !i ? `${name} (copy)` : `${name} (copy ${i})`;
        const exists = this.hasDrilldownWithName(proposedName);
        if (!exists) return proposedName;
      }
    }
    return name;
  }

  public readonly onCreateFromTemplate = async (templateId: string) => {
    const { templates } = this.deps;
    if (!templates) return;
    const template = templates.find(({ id }) => id === templateId);
    if (!template) return;
    const factory = this.deps.factories.find(({ type }) => type === template.drilldownState.type);
    if (!factory) return;
    this.setDrilldownFactory(factory);
    const drilldownManager = this.getDrilldownManager();
    if (drilldownManager) {
      drilldownManager.setState({
        ...template.drilldownState,
        label: this.pickName(template.drilldownState.label),
      });
    }
  };

  public readonly cloneDrilldown = async (actionId: string) => {
    const { drilldowns$, factories } = this.deps;
    const drilldownState = drilldowns$
      .getValue()
      .find((drilldown) => drilldown.actionId === actionId);
    if (!drilldownState) return null;

    const factory = factories.find(({ type }) => type === drilldownState.type);
    if (!factory) return null;

    this.setDrilldownFactory(factory);
    const drilldownManager = this.getDrilldownManager();
    if (drilldownManager) {
      drilldownManager.setState({
        ...drilldownState,
        label: this.pickName(drilldownState.label),
      });
    }
  };

  /**
   * Returns the drilldown manager of an existing drilldown for editing purposes.
   *
   * @param actionId action ID of the drilldown.
   */
  public createDrilldownManager(actionId: string): null | DrilldownManager {
    const { drilldowns$, factories, triggers } = this.deps;
    const drilldownState = drilldowns$
      .getValue()
      .find((drilldown) => drilldown.actionId === actionId);
    if (!drilldownState) return null;

    const factory = factories.find(({ type }) => type === drilldownState.type);
    if (!factory) return null;

    const state = new DrilldownManager({
      factory,
      triggers,
      initialState: drilldownState,
    });
    return state;
  }

  /**
   * Save edits to an existing drilldown.
   *
   * @param actionId ID of the saved dynamic action event.
   * @param drilldown DrilldownManager
   */
  public async updateDrilldown(actionId: string, drilldown: DrilldownManager): Promise<void> {
    const { drilldowns$, setDrilldowns, toastService } = this.deps;
    try {
      const drilldownState = drilldown.serialize();
      setDrilldowns([
        ...drilldowns$.getValue().filter((d) => d.actionId !== actionId),
        drilldownState,
      ]);
      toastService.addSuccess({
        title: toastDrilldownEdited.title(drilldownState.label),
        text: toastDrilldownEdited.text,
      });
      this.setRoute(['manage']);
    } catch (error) {
      toastService.addError(error, {
        title: toastDrilldownsCRUDError,
      });
      throw error;
    }
  }

  // Below are convenience React hooks for consuming observables in connected
  // React components.

  public readonly useTitle = () => useObservable(this.title$, this.title$.getValue());
  public readonly useFooter = () => useObservable(this.footer$, this.footer$.getValue());
  public readonly useRoute = () => useObservable(this.route$, this.route$.getValue());
  public readonly useWelcomeMessage = () =>
    useObservable(this.hideWelcomeMessage$, this.hideWelcomeMessage$.getValue());
  public readonly useDrilldownFactory = () =>
    useObservable(
      this.route$.pipe(map(() => this.getDrilldownManager()?.factory)),
      this.getDrilldownManager()?.factory
    );
  public readonly useTableItems = () =>
    useTableItems(
      this.deps.drilldowns$,
      this.deps.factories,
      this.deps.getTrigger,
      this.deps.triggers
    );
}

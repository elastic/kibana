import { BehaviorSubject } from 'rxjs';
import type { ToastsStart } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { Trigger } from '@kbn/ui-actions-plugin/public';
import type { DrilldownFactory, DrilldownTemplate } from '../types';
import { DrilldownManager } from './drilldown_manager';
import type { HasDrilldowns } from '../../types';
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
export declare class DrilldownsManager {
    readonly deps: DrilldownsManagerDeps;
    /**
     * Title displayed at the top of <DrilldownManager> flyout.
     */
    private readonly title$;
    /**
     * Footer displayed at the bottom of <DrilldownManager> flyout.
     */
    private readonly footer$;
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
    readonly route$: BehaviorSubject<string[]>;
    /**
     * Whether a drilldowns welcome message should be displayed to the user at
     * the very top of the drilldowns manager flyout.
     */
    readonly hideWelcomeMessage$: BehaviorSubject<boolean>;
    /**
     * Drilldown manager for each drilldown type used for new drilldown creation, so when user
     * switches between drilldown types the configuration of the previous
     * drilldown is preserved.
     */
    readonly drilldownManagers: Map<string, DrilldownManager>;
    /**
     * Whether user can unlock more drilldown types if they subscribe to a higher
     * license tier.
     */
    readonly canUnlockMoreDrilldowns: boolean;
    /**
     * Used to show cloning success notification.
     */
    lastCloneRecord: null | {
        time: number;
        templateIds: string[];
    };
    constructor(deps: DrilldownsManagerDeps);
    /**
     * Set flyout main heading text.
     * @param title New title.
     */
    setTitle(title: React.ReactNode): void;
    /**
     * Set the new flyout footer that renders at the very bottom of the Drilldown
     * Manager flyout.
     * @param footer New title.
     */
    setFooter(footer: React.ReactNode): void;
    /**
     * Set the flyout main heading back to its default state.
     */
    resetTitle(): void;
    /**
     * Change the screen of Drilldown Manager.
     */
    setRoute(route: string[]): void;
    /**
     * Callback called to hide drilldowns welcome message, and remember in local
     * storage that user opted to hide this message.
     */
    readonly hideWelcomeMessage: () => void;
    /**
     * Select a different drilldown.
     */
    setDrilldownFactory(nextFactory: undefined | DrilldownFactory): void;
    /**
     * Close the drilldown flyout.
     */
    readonly close: () => void;
    /**
     * Get state object of the drilldown which is currently being created.
     */
    getDrilldownManager(): undefined | DrilldownManager;
    /**
     * Called when user presses "Create drilldown" button to save the
     * currently edited drilldown.
     */
    createDrilldown(): Promise<void>;
    /**
     * Deletes a list of drilldowns and shows toast notifications to the user.
     *
     * @param ids Drilldown IDs.
     */
    readonly onDelete: (ids: string[]) => void;
    /**
     * Clone a list of selected templates.
     */
    readonly onCloneTemplates: (templateIds: string[]) => Promise<void>;
    /**
     * Checks if drilldown with such a name already exists.
     */
    private hasDrilldownWithName;
    /**
     * Picks a unique name for the cloned drilldown. Adds "(copy)", "(copy 1)",
     * "(copy 2)", etc. if drilldown with such name already exists.
     */
    private pickName;
    readonly onCreateFromTemplate: (templateId: string) => Promise<void>;
    readonly cloneDrilldown: (actionId: string) => Promise<null | undefined>;
    /**
     * Returns the drilldown manager of an existing drilldown for editing purposes.
     *
     * @param actionId action ID of the drilldown.
     */
    createDrilldownManager(actionId: string): null | DrilldownManager;
    /**
     * Save edits to an existing drilldown.
     *
     * @param actionId ID of the saved dynamic action event.
     * @param drilldown DrilldownManager
     */
    updateDrilldown(actionId: string, drilldown: DrilldownManager): Promise<void>;
    readonly useTitle: () => import("react").ReactNode;
    readonly useFooter: () => import("react").ReactNode;
    readonly useRoute: () => string[];
    readonly useWelcomeMessage: () => boolean;
    readonly useDrilldownFactory: () => DrilldownFactory | undefined;
    readonly useTableItems: () => {
        id: string;
        drilldownName: string;
        actionName: string;
        icon: string | undefined;
        error: string | undefined;
        trigger: Trigger;
        triggerIncompatible: boolean;
    }[];
}

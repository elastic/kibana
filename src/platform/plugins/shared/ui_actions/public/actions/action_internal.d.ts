import type * as React from 'react';
import type { Presentable, PresentableGrouping } from '@kbn/ui-actions-browser/src/types';
import type { Action, ActionDefinition, ActionMenuItemProps } from './action';
/**
 * @internal
 */
export declare class ActionInternal<Context extends object = object, ActionExtension extends object = object> implements Action<Context, ActionExtension>, Presentable<Context> {
    readonly definition: ActionDefinition<Context, ActionExtension>;
    readonly id: string;
    readonly type: string;
    readonly order: number;
    readonly MenuItem?: React.FC<ActionMenuItemProps<any>>;
    readonly grouping?: PresentableGrouping<Context>;
    readonly showNotification?: boolean;
    readonly disabled?: boolean;
    readonly getCompatibilityChangesSubject?: Action<Context>['getCompatibilityChangesSubject'];
    readonly couldBecomeCompatible?: Action<Context>['couldBecomeCompatible'];
    errorLogged?: boolean;
    readonly extension?: ActionExtension;
    constructor(definition: ActionDefinition<Context, ActionExtension>);
    execute(context: Context): Promise<void>;
    getIconType(context: Context): string | undefined;
    getDisplayName(context: Context): string;
    getDisplayNameTooltip(context: Context): string;
    isCompatible(context: Context): Promise<boolean>;
    getHref(context: Context): Promise<string | undefined>;
    shouldAutoExecute(context: Context): Promise<boolean>;
}

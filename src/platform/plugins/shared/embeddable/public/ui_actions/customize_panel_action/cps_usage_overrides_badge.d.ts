import type { Action, ActionExecutionMeta, FrequentCompatibilityChangeAction } from '@kbn/ui-actions-plugin/public';
import React from 'react';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
export declare class CpsUsageOverridesBadge implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext> {
    readonly type = "CPS_USAGE_OVERRIDES_BADGE";
    readonly id = "CPS_USAGE_OVERRIDES_BADGE";
    order: number;
    getDisplayName({ embeddable }: EmbeddableApiContext): string;
    readonly MenuItem: ({ context }: {
        context: EmbeddableApiContext;
    }) => React.JSX.Element;
    execute(_context: ActionExecutionMeta & EmbeddableApiContext): Promise<void>;
    couldBecomeCompatible({ embeddable }: EmbeddableApiContext): boolean;
    getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext): import("rxjs").Observable<undefined> | undefined;
    getIconType(): string;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
    private getOverrideValues;
}

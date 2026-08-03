import type { Action, ActionExecutionMeta, FrequentCompatibilityChangeAction } from '@kbn/ui-actions-plugin/public';
import React from 'react';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
export declare class CustomTimeRangeBadge implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext> {
    readonly type = "CUSTOM_TIME_RANGE_BADGE";
    readonly id = "CUSTOM_TIME_RANGE_BADGE";
    order: number;
    getDisplayName({ embeddable }: EmbeddableApiContext): string;
    readonly MenuItem: ({ context }: {
        context: EmbeddableApiContext;
    }) => React.JSX.Element;
    couldBecomeCompatible({ embeddable }: EmbeddableApiContext): boolean;
    getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext): import("rxjs").Observable<undefined> | undefined;
    execute(context: ActionExecutionMeta & EmbeddableApiContext): Promise<void>;
    getIconType(): string;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
}

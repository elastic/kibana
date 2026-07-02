import React from 'react';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
export declare class AddSectionAction implements Action<EmbeddableApiContext> {
    readonly type = "addCollapsibleSection";
    readonly id = "addCollapsibleSection";
    order: number;
    grouping: {
        id: string;
        getDisplayName: () => string;
        order: number;
    }[];
    getDisplayName(): string;
    getIconType(): string;
    readonly MenuItem: () => React.JSX.Element;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
    execute({ embeddable }: EmbeddableApiContext): Promise<void>;
}

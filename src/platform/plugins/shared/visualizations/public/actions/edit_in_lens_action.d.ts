import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import React from 'react';
export declare class EditInLensAction implements Action<EmbeddableApiContext> {
    private readonly timefilter;
    id: string;
    readonly type = "ACTION_EDIT_IN_LENS";
    order: number;
    showNotification: boolean;
    currentAppId: string | undefined;
    constructor(timefilter: TimefilterContract);
    execute(context: EmbeddableApiContext): Promise<void>;
    getDisplayName(): string;
    MenuItem: React.FC<{}>;
    getIconType(): string;
    isCompatible(context: EmbeddableApiContext): Promise<boolean>;
}

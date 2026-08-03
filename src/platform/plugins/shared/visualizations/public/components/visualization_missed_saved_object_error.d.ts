import React from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-plugin/common';
import type { RenderMode } from '@kbn/expressions-plugin/common';
interface VisualizationMissedSavedObjectErrorProps {
    savedObjectMeta: {
        savedObjectType: typeof DATA_VIEW_SAVED_OBJECT_TYPE | 'search';
    };
    application: ApplicationStart;
    message: string;
    renderMode: RenderMode;
}
export declare const VisualizationMissedSavedObjectError: ({ savedObjectMeta, application, message, renderMode, }: VisualizationMissedSavedObjectErrorProps) => React.JSX.Element;
export {};

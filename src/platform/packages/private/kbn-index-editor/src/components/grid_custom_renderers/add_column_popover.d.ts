import type { PropsWithChildren } from 'react';
import React from 'react';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';
interface AddColumnPopoverProps {
    isPopoverOpen: boolean;
    closePopover: () => void;
    initialColumnName?: string;
    initialColumnType?: string;
    columnIndex?: number;
    telemetryService: IndexEditorTelemetryService;
    triggerButton: React.ReactElement;
}
export declare const COLUMN_INDEX_PROP = "data-column-index";
export declare const AddColumnPopover: ({ isPopoverOpen, closePopover, initialColumnName, initialColumnType, columnIndex, telemetryService, triggerButton, }: PropsWithChildren<AddColumnPopoverProps>) => React.JSX.Element;
export {};

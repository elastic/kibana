import React, { Component } from 'react';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
interface DataDownloadOptionsState {
    isPopoverOpen: boolean;
}
interface DataDownloadOptionsProps {
    title: string;
    datatables: Datatable[];
    uiSettings: IUiSettingsClient;
    isFormatted?: boolean;
    fieldFormats: FieldFormatsStart;
}
declare class DataDownloadOptions extends Component<DataDownloadOptionsProps, DataDownloadOptionsState> {
    state: {
        isPopoverOpen: boolean;
    };
    onTogglePopover: () => void;
    closePopover: () => void;
    exportCsv: (isFormatted?: boolean) => void;
    exportFormattedCsv: () => void;
    exportFormattedAsRawCsv: () => void;
    renderFormattedDownloads(): React.JSX.Element;
    render(): React.JSX.Element;
}
export { DataDownloadOptions };

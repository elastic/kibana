import { EventEmitter } from 'events';
import type { Datatable } from '../expression_types/specs';
export declare class TablesAdapter extends EventEmitter {
    #private;
    allowCsvExport: boolean;
    /**
     * Controls how Inspector Data displays missing values while keeping the raw cell value intact.
     */
    missingValueDisplay: 'text' | 'table';
    /** Key of table to set as initial selection */
    initialSelectedTable?: string;
    logDatatable(key: string, datatable: Datatable): void;
    reset(): void;
    get tables(): {
        [key: string]: Datatable;
    };
}

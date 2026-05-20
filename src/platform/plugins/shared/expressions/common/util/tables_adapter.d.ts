import { EventEmitter } from 'events';
import type { Datatable } from '../expression_types/specs';
export declare class TablesAdapter extends EventEmitter {
    #private;
    allowCsvExport: boolean;
    /** Key of table to set as initial selection */
    initialSelectedTable?: string;
    logDatatable(key: string, datatable: Datatable): void;
    reset(): void;
    get tables(): {
        [key: string]: Datatable;
    };
}

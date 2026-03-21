import type { Datatable } from '@kbn/expressions-plugin/common';
export declare const cellHasFormulas: (val: string) => boolean;
export declare const tableHasFormulas: (columns: Datatable["columns"], rows: Datatable["rows"]) => boolean;

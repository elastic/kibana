import type { Observable } from 'rxjs';
import type { ExpressionFunctionDefinition } from '../types';
import type { Datatable } from '../../expression_types';
export interface MapColumnArguments {
    id?: string | null;
    name: string;
    expression(datatable: Datatable): Observable<boolean | number | string | null>;
    copyMetaFrom?: string | null;
}
export declare const mapColumn: ExpressionFunctionDefinition<'mapColumn', Datatable, MapColumnArguments, Observable<Datatable>>;

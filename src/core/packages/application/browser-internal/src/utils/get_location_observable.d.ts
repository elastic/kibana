import type { Observable } from 'rxjs';
import type { History } from 'history';
export interface Location {
    pathname: string;
    hash: string;
}
export declare const getLocationObservable: (initialLocation: Location, history: History) => Observable<string>;

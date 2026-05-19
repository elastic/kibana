import type React from 'react';
import { type Observable } from 'rxjs';
import type { FatalError } from '@kbn/core-fatal-errors-browser';
interface FatalErrorScreenProps {
    error$: Observable<FatalError>;
    children: (errors: FatalError[]) => React.ReactNode;
}
export declare function FatalErrorScreen({ children, error$ }: FatalErrorScreenProps): React.ReactNode;
export {};

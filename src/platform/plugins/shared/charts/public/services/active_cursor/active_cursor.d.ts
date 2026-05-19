import { Subject } from 'rxjs';
import type { ActiveCursorPayload } from './types';
export declare class ActiveCursor {
    activeCursor$?: Subject<ActiveCursorPayload>;
    setup(): void;
}

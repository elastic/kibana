import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import type { SerializedEvent } from './types';
/**
 * This CRUD interface needs to be implemented by dynamic action users if they
 * want to persist the dynamic actions. It has a default implementation in
 * Embeddables, however one can use the dynamic actions without Embeddables,
 * in that case they have to implement this interface.
 */
export interface ActionStorage {
    create(event: SerializedEvent): Promise<void>;
    update(event: SerializedEvent): Promise<void>;
    remove(eventId: string): Promise<void>;
    read(eventId: string): Promise<SerializedEvent>;
    count(): Promise<number>;
    list(): Promise<SerializedEvent[]>;
    /**
     * Triggered every time events changed in storage and should be re-loaded.
     */
    readonly reload$?: Observable<void>;
}
export declare abstract class AbstractActionStorage implements ActionStorage {
    readonly reload$: Observable<void> & Pick<Subject<void>, 'next'>;
    count(): Promise<number>;
    read(eventId: string): Promise<SerializedEvent>;
    abstract create(event: SerializedEvent): Promise<void>;
    abstract update(event: SerializedEvent): Promise<void>;
    abstract remove(eventId: string): Promise<void>;
    abstract list(): Promise<SerializedEvent[]>;
}
/**
 * This is an in-memory implementation of ActionStorage. It is used in testing,
 * but can also be used production code to store events in memory.
 */
export declare class MemoryActionStorage extends AbstractActionStorage {
    events: readonly SerializedEvent[];
    constructor(events?: readonly SerializedEvent[]);
    list(): Promise<{
        eventId: string;
        triggers: string[];
        action: import("./types").SerializedAction;
    }[]>;
    create(event: SerializedEvent): Promise<void>;
    update(event: SerializedEvent): Promise<void>;
    remove(eventId: string): Promise<void>;
}

import { BehaviorSubject } from 'rxjs';
export declare class SimpleStateSubject<S extends object = {}> extends BehaviorSubject<S> {
    constructor(initialState: S);
    getSnapshot(): S;
    setState(nextState: Partial<S>): void;
}
export declare const createStateSubject: <S extends object = {}>(initialState: S) => SimpleStateSubject<S>;

export type StoreReducer<State, Payload = void> = (state: State, payload: Payload) => State;
type ExtractPayload<T> = T extends StoreReducer<any, infer P> ? P extends void ? never : P : never;
type HasPayload<T> = T extends StoreReducer<any, void> ? false : true;
export type ActionsFromReducers<T extends ReducersMap<any>> = {
    [K in keyof T]: HasPayload<T[K]> extends false ? () => void : (payload: ExtractPayload<T[K]>) => void;
};
export interface ReducersMap<State> {
    [K: string]: StoreReducer<State, any>;
}
export interface CreateStoreProps<State, Reducers extends ReducersMap<State>> {
    initialState: State;
    reducers: Reducers;
}
export declare const useCreateStore: <S extends object, R extends ReducersMap<S>>({ reducers, initialState, }: CreateStoreProps<S, R>) => {
    state: S;
    readonly actions: ActionsFromReducers<R>;
};
export {};

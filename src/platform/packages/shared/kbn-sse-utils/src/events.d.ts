export type ServerSentEventBase<TEventType extends string, TData extends Record<string, any>> = keyof TData extends 'type' ? never : TData & {
    type: TEventType;
};
export declare enum ServerSentEventType {
    error = "error",
    data = "data"
}
export type ServerSentEvent = ServerSentEventBase<string, Record<string, unknown>>;

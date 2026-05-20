import type { EventObject, Subscribable } from 'xstate';
/**
 * Expression function type - takes context and event, returns a result.
 * Updated for XState v5: receives destructured args object.
 */
type ExpressionFunction<TContext, TEvent extends EventObject, TResult> = (args: {
    context: TContext;
    event: TEvent;
}) => TResult;
/**
 * Simple action function type for notification channel.
 * Updated for XState v5: receives destructured args object.
 */
type NotificationAction<TContext, TEvent extends EventObject> = (args: {
    context: TContext;
    event: TEvent;
}) => void;
export interface NotificationChannel<TContext, TEvent extends EventObject, TSentEvent> {
    createService: () => Subscribable<TSentEvent>;
    notify: (eventExpr: ExpressionFunction<TContext, TEvent, TSentEvent | undefined>) => NotificationAction<TContext, TEvent>;
}
export declare const createNotificationChannel: <TContext, TEvent extends EventObject, TSentEvent>(shouldReplayLastEvent?: boolean) => NotificationChannel<TContext, TEvent, TSentEvent>;
export {};

import type { ContentEvent, ContentEventType } from './event_types';
/**
 * Content event listener
 */
export type EventListener = (arg: ContentEvent) => void;
/**
 * Event bus for all content generated events
 */
export declare class EventBus {
    private contentTypeValidator?;
    /** The events Rxjs Subject */
    private _events$;
    /** Map of listener for each content type */
    private eventListeners;
    /** Subscription to the _events$ Observable */
    private eventsSubscription;
    /**
     * @param contentTypeValidator Handler to validate if a content type is valid or not
     */
    constructor(contentTypeValidator?: ((contentType: string) => boolean) | undefined);
    /**
     *
     *
     * @param type The event type e.g. "getItemSuccess")
     * @param cb Callback to execute
     *
     * @example
     *
     * ```ts
     * // Register an event for all content types
     * eventBus.on('getItemSuccess', (event) => {})
     *
     * // Register an event for the "dashboard" content type
     * * eventBus.on('getItemSuccess', 'dashboard', (event) => {})
     * ```
     */
    /**
     * Register an event listener for specific events on specific content types
     *
     * @param eventType The event type to listen to
     * @param contentType The content type to listen to (if not specified all content types will send the event type)
     * @param cb Handler to call when the event occurs
     *
     * @returns Handler to unsubscribe
     */
    on(eventType: ContentEventType, cb: EventListener): () => void;
    on<ContentType extends string = string>(eventType: ContentEventType, contentType: ContentType, cb: EventListener): () => void;
    /**
     * Send an event to the CM event bus
     * @param event The event to send
     */
    emit(event: ContentEvent): void;
    /** Content management events Observable */
    get events$(): import("rxjs").Observable<ContentEvent>;
    stop(): void;
}

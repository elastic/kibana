import { EventEmitter } from 'events';
import { RequestResponder } from './request_responder';
import type { Request, RequestParams } from './types';
/**
 * An generic inspector adapter to log requests.
 * These can be presented in the inspector using the requests view.
 * The adapter is not coupled to a specific implementation or even Elasticsearch
 * instead it offers a generic API to log requests of any kind.
 * @extends EventEmitter
 */
export declare class RequestAdapter extends EventEmitter {
    private requests;
    private responses;
    constructor();
    /**
     * Start logging a new request into this request adapter. The new request will
     * by default be in a processing state unless you explicitly finish it via
     * {@link RequestResponder#finish}, {@link RequestResponder#ok} or
     * {@link RequestResponder#error}.
     *
     * @param  {string} name The name of this request as it should be shown in the UI.
     * @param  {RequestParams} params Additional arguments for the request.
     * @param  {number} [startTime] Set an optional start time for the request
     * @return {RequestResponder} An instance to add information to the request and finish it.
     */
    start(name: string, params?: RequestParams, startTime?: number): RequestResponder;
    loadFromEntries(requests: Map<string, Request>, responses: WeakMap<Request, RequestResponder>): void;
    reset(): void;
    resetRequest(id: string): void;
    getRequests(): Request[];
    getRequestsSince(time: number): Request[];
    getRequestEntries(): Array<[Request, RequestResponder]>;
    private _onChange;
}

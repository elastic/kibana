import type { Request, RequestStatistics, Response } from './types';
import { RequestStatus } from './types';
/**
 * An API to specify information about a specific request that will be logged.
 * Create a new instance to log a request using {@link RequestAdapter#start}.
 */
export declare class RequestResponder {
    private readonly request;
    private readonly onChange;
    constructor(request: Request, onChange: () => void);
    json(reqJson: object): RequestResponder;
    stats(stats: RequestStatistics): RequestResponder;
    finish(status: RequestStatus, response: Response): void;
    ok(response: Response): void;
    error(response: Response): void;
}

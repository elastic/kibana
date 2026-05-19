import type { Request } from '@kbn/inspector-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
/**
 * A request adapter that aggregates multiple separate adapters into one to allow inspection
 */
export declare class AggregateRequestAdapter extends RequestAdapter {
    private readonly adapters;
    constructor(adapters: RequestAdapter[]);
    reset(...args: Parameters<RequestAdapter['reset']>): void;
    resetRequest(...args: Parameters<RequestAdapter['resetRequest']>): void;
    getRequests(...args: Parameters<RequestAdapter['getRequests']>): Request[];
    addListener(...args: Parameters<RequestAdapter['addListener']>): this;
    on(...args: Parameters<RequestAdapter['on']>): this;
    once(...args: Parameters<RequestAdapter['once']>): this;
    removeListener(...args: Parameters<RequestAdapter['removeListener']>): this;
    off(...args: Parameters<RequestAdapter['off']>): this;
    removeAllListeners(...args: Parameters<RequestAdapter['removeAllListeners']>): this;
    setMaxListeners(...args: Parameters<RequestAdapter['setMaxListeners']>): this;
    getMaxListeners(...args: Parameters<RequestAdapter['getMaxListeners']>): number;
    listeners(...args: Parameters<RequestAdapter['listeners']>): Function[];
    rawListeners(...args: Parameters<RequestAdapter['rawListeners']>): Function[];
    emit(...args: Parameters<RequestAdapter['emit']>): boolean;
    listenerCount(...args: Parameters<RequestAdapter['listenerCount']>): number;
    prependListener(...args: Parameters<RequestAdapter['prependListener']>): this;
    prependOnceListener(...args: Parameters<RequestAdapter['prependOnceListener']>): this;
    eventNames(...args: Parameters<RequestAdapter['eventNames']>): Array<string | symbol>;
}

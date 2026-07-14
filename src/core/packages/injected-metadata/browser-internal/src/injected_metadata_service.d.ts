import type { InjectedMetadataParams, InternalInjectedMetadataSetup, InternalInjectedMetadataStart } from './types';
/**
 * Provides access to the metadata that is injected by the
 * server into the page. The metadata is actually defined
 * in the entry file for the bundle containing the new platform
 * and is read from the DOM in most cases.
 *
 * @internal
 */
export declare class InjectedMetadataService {
    private readonly params;
    private state;
    constructor(params: InjectedMetadataParams);
    start(): InternalInjectedMetadataSetup;
    setup(): InternalInjectedMetadataStart;
}

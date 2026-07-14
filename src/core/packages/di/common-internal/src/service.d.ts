import { Container } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { InternalCoreDiServiceSetup, InternalCoreDiServiceStart } from './contracts';
/** @internal */
export declare class CoreInjectionService {
    private static readonly DEFAULT_CONTAINER_OPTIONS;
    private root;
    private module;
    constructor();
    protected getContainer(id?: PluginOpaqueId, container?: Container): Container;
    protected fork(id?: PluginOpaqueId, container?: Container): Container;
    setup(): InternalCoreDiServiceSetup;
    start(): InternalCoreDiServiceStart;
}

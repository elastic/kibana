import type { Container } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
/** @internal */
export interface InternalCoreDiServiceSetup {
    getContainer(id?: PluginOpaqueId, container?: Container): Container;
}
/** @internal */
export interface InternalCoreDiServiceStart extends InternalCoreDiServiceSetup {
    fork(id?: PluginOpaqueId, container?: Container): Container;
}

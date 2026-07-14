import type { CoreContext } from '@kbn/core-base-server-internal';
import type { ILoggingSystem } from '@kbn/core-logging-server-internal';
import type { NodeRoles } from '@kbn/core-node-server';
/**
 * @internal
 */
export interface InternalNodeServicePreboot {
    /**
     * The Kibana process can take on specialised roles via the `node.roles` config.
     *
     * The roles can be used by plugins to adjust their behavior based
     * on the way the Kibana process has been configured.
     */
    roles: NodeRoles;
}
export interface InternalNodeServiceStart {
    /**
     * The Kibana process can take on specialised roles via the `node.roles` config.
     *
     * The roles can be used by plugins to adjust their behavior based
     * on the way the Kibana process has been configured.
     */
    roles: NodeRoles;
}
export interface PrebootDeps {
    loggingSystem: ILoggingSystem;
}
/** @internal */
export declare class NodeService {
    private readonly configService;
    private readonly log;
    private roles?;
    constructor(core: CoreContext);
    preboot({ loggingSystem }: PrebootDeps): Promise<InternalNodeServicePreboot>;
    start(): InternalNodeServiceStart;
    stop(): void;
    private getNodeRoles;
}

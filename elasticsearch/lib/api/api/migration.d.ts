import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Migration {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Retrieves information about different cluster, node, and index level settings that use deprecated features that will be removed or changed in the next major version.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/migration-api-deprecation.html | Elasticsearch API documentation}
      */
    deprecations(this: That, params?: T.MigrationDeprecationsRequest | TB.MigrationDeprecationsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MigrationDeprecationsResponse>;
    deprecations(this: That, params?: T.MigrationDeprecationsRequest | TB.MigrationDeprecationsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MigrationDeprecationsResponse, unknown>>;
    deprecations(this: That, params?: T.MigrationDeprecationsRequest | TB.MigrationDeprecationsRequest, options?: TransportRequestOptions): Promise<T.MigrationDeprecationsResponse>;
    /**
      * Find out whether system features need to be upgraded or not
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/migration-api-feature-upgrade.html | Elasticsearch API documentation}
      */
    getFeatureUpgradeStatus(this: That, params?: T.MigrationGetFeatureUpgradeStatusRequest | TB.MigrationGetFeatureUpgradeStatusRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MigrationGetFeatureUpgradeStatusResponse>;
    getFeatureUpgradeStatus(this: That, params?: T.MigrationGetFeatureUpgradeStatusRequest | TB.MigrationGetFeatureUpgradeStatusRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MigrationGetFeatureUpgradeStatusResponse, unknown>>;
    getFeatureUpgradeStatus(this: That, params?: T.MigrationGetFeatureUpgradeStatusRequest | TB.MigrationGetFeatureUpgradeStatusRequest, options?: TransportRequestOptions): Promise<T.MigrationGetFeatureUpgradeStatusResponse>;
    /**
      * Begin upgrades for system features
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/migration-api-feature-upgrade.html | Elasticsearch API documentation}
      */
    postFeatureUpgrade(this: That, params?: T.MigrationPostFeatureUpgradeRequest | TB.MigrationPostFeatureUpgradeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MigrationPostFeatureUpgradeResponse>;
    postFeatureUpgrade(this: That, params?: T.MigrationPostFeatureUpgradeRequest | TB.MigrationPostFeatureUpgradeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MigrationPostFeatureUpgradeResponse, unknown>>;
    postFeatureUpgrade(this: That, params?: T.MigrationPostFeatureUpgradeRequest | TB.MigrationPostFeatureUpgradeRequest, options?: TransportRequestOptions): Promise<T.MigrationPostFeatureUpgradeResponse>;
}
export {};

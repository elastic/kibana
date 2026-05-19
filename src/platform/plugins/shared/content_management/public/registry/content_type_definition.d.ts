import type { Version } from '@kbn/object-versioning';
import type { CrudClient } from '../crud_client';
/**
 * Content type definition as it is registered in the content registry.
 */
export interface ContentTypeDefinition {
    /**
     * ID of the type. Must be unique. Like "dashboard", "visualization", etc.
     */
    id: string;
    /**
     * Human-readable name of the type. Like "Dashboard", "Visualization", etc.
     */
    name?: string;
    /**
     * Human-readable description of the type.
     */
    description?: string;
    /**
     * Icon to use for this type. Usually an EUI icon type.
     *
     * @see https://elastic.github.io/eui/#/display/icons
     */
    icon?: string;
    /**
     * CRUD client to use for this type.
     * If not provided the default CRUD client is used assuming that this type has a server-side content registry
     */
    crud?: CrudClient;
    version: {
        /** The latest version for this content */
        latest: Version;
    };
}

import type { ContentTypeDefinition } from './content_type_definition';
import type { CrudClient } from '../crud_client';
export declare class ContentType {
    readonly definition: ContentTypeDefinition;
    constructor(definition: ContentTypeDefinition);
    get id(): string;
    get name(): string;
    get description(): string;
    get icon(): string;
    get crud(): CrudClient | undefined;
    get version(): ContentTypeDefinition['version'];
}

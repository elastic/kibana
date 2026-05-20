import { ContentCrud } from './crud';
import type { EventBus } from './event_bus';
import type { ContentStorage, ContentTypeDefinition } from './types';
export declare class ContentType {
    /** Content definition. */
    private readonly _definition;
    /** Content crud instance. */
    private readonly contentCrud;
    constructor(definition: ContentTypeDefinition, eventBus: EventBus);
    get id(): string;
    get definition(): ContentTypeDefinition<ContentStorage<unknown, unknown, import("./types").MSearchConfig<unknown, unknown>>>;
    get storage(): ContentStorage<unknown, unknown, import("./types").MSearchConfig<unknown, unknown>>;
    get crud(): ContentCrud<unknown>;
    get version(): {
        latest: import("@kbn/object-versioning").Version;
    };
}

import type { ContentTypeDefinition } from './content_type_definition';
import { ContentType } from './content_type';
export declare class ContentTypeRegistry {
    private readonly types;
    register(definition: ContentTypeDefinition): ContentType;
    get(id: string): ContentType | undefined;
    getAll(): ContentType[];
}

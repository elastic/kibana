import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class TextStructure {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Finds the structure of a text field in an index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/find-field-structure.html | Elasticsearch API documentation}
      */
    findFieldStructure(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    findFieldStructure(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    findFieldStructure(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Finds the structure of a list of messages. The messages must contain data that is suitable to be ingested into Elasticsearch.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/find-message-structure.html | Elasticsearch API documentation}
      */
    findMessageStructure(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    findMessageStructure(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    findMessageStructure(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Finds the structure of a text file. The text file must contain data that is suitable to be ingested into Elasticsearch.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/find-structure.html | Elasticsearch API documentation}
      */
    findStructure<TJsonDocument = unknown>(this: That, params: T.TextStructureFindStructureRequest<TJsonDocument> | TB.TextStructureFindStructureRequest<TJsonDocument>, options?: TransportRequestOptionsWithOutMeta): Promise<T.TextStructureFindStructureResponse>;
    findStructure<TJsonDocument = unknown>(this: That, params: T.TextStructureFindStructureRequest<TJsonDocument> | TB.TextStructureFindStructureRequest<TJsonDocument>, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TextStructureFindStructureResponse, unknown>>;
    findStructure<TJsonDocument = unknown>(this: That, params: T.TextStructureFindStructureRequest<TJsonDocument> | TB.TextStructureFindStructureRequest<TJsonDocument>, options?: TransportRequestOptions): Promise<T.TextStructureFindStructureResponse>;
    /**
      * Tests a Grok pattern on some text.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/test-grok-pattern.html | Elasticsearch API documentation}
      */
    testGrokPattern(this: That, params: T.TextStructureTestGrokPatternRequest | TB.TextStructureTestGrokPatternRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TextStructureTestGrokPatternResponse>;
    testGrokPattern(this: That, params: T.TextStructureTestGrokPatternRequest | TB.TextStructureTestGrokPatternRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TextStructureTestGrokPatternResponse, unknown>>;
    testGrokPattern(this: That, params: T.TextStructureTestGrokPatternRequest | TB.TextStructureTestGrokPatternRequest, options?: TransportRequestOptions): Promise<T.TextStructureTestGrokPatternResponse>;
}
export {};

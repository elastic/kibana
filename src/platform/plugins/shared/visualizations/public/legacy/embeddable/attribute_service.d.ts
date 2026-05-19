import type { VisualizeByReferenceInput, VisualizeByValueInput, VisualizeSavedObjectAttributes } from './visualize_embeddable';
/**
 * The attribute service is a shared, generic service that embeddables can use to provide the functionality
 * required to fulfill the requirements of the ReferenceOrValueEmbeddable interface. The attribute_service
 * can also be used as a higher level wrapper to transform an embeddable input shape that references a saved object
 * into an embeddable input shape that contains that saved object's attributes by value.
 */
export declare const ATTRIBUTE_SERVICE_KEY = "attributes";
export interface GenericAttributes {
    title: string;
}
export interface AttributeServiceUnwrapResult {
    attributes: VisualizeSavedObjectAttributes;
    metaInfo?: unknown;
}
export interface AttributeServiceOptions {
    saveMethod: (attributes: VisualizeSavedObjectAttributes, savedObjectId?: string) => Promise<{
        id?: string;
    } | {
        error: Error;
    }>;
    unwrapMethod?: (savedObjectId: string) => Promise<AttributeServiceUnwrapResult>;
}
export declare class AttributeService {
    private type;
    private options;
    constructor(type: string, options: AttributeServiceOptions);
    private defaultUnwrapMethod;
    unwrapAttributes(input: VisualizeByReferenceInput | VisualizeByValueInput): Promise<AttributeServiceUnwrapResult>;
    wrapAttributes(newAttributes: VisualizeSavedObjectAttributes, useRefType: boolean, input?: VisualizeByValueInput | VisualizeByReferenceInput): Promise<Omit<VisualizeByValueInput | VisualizeByReferenceInput, 'id'>>;
    inputIsRefType: (input: VisualizeByValueInput | VisualizeByReferenceInput) => input is VisualizeByReferenceInput;
    getInputAsValueType: (input: VisualizeByValueInput | VisualizeByReferenceInput) => Promise<VisualizeByValueInput>;
    getInputAsRefType: (input: VisualizeByValueInput | VisualizeByReferenceInput, saveOptions?: {
        showSaveModal: boolean;
        saveModalTitle?: string;
    } | {
        title: string;
    }) => Promise<VisualizeByReferenceInput>;
}

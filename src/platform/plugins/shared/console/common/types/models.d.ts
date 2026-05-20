import type { TextObject } from '../text_object';
export interface IdObject {
    id: string;
}
export interface ObjectStorage<O extends IdObject> {
    /**
     * Creates a new object in the underlying persistance layer.
     *
     * @remarks Does not accept an ID, a new ID is generated and returned with the newly created object.
     */
    create(obj: Omit<O, 'id'>): Promise<O>;
    /**
     * This method should update specific object in the persistance layer.
     */
    update(obj: O): Promise<void>;
    /**
     * A function that will return all of the objects in the persistance layer.
     *
     * @remarks Unless an error is thrown this function should always return an array (empty if there are not objects present).
     */
    findAll(): Promise<O[]>;
}
export interface ObjectStorageClient {
    text: ObjectStorage<TextObject>;
}

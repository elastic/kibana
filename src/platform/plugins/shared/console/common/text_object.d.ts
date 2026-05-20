export declare const textObjectTypeName = "text-object";
/**
 * Describes the shape of persisted objects that contain information about the current text in the
 * text editor.
 */
export interface TextObject {
    /**
     * An ID that uniquely identifies this object.
     */
    id: string;
    /**
     * UNIX timestamp of when the object was created.
     */
    createdAt: number;
    /**
     * UNIX timestamp of when the object was last updated.
     */
    updatedAt: number;
    /**
     * Text value input by the user.
     *
     * Used to re-populate a text editor buffer.
     */
    text: string | undefined;
}

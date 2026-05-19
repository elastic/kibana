import { type FunctionComponent } from 'react';
import type { FileJSON } from '@kbn/shared-ux-file-types';
/**
 * An object representing an uploaded file
 */
export interface UploadedFile<Meta = unknown> {
    /**
     * The ID that was generated for the uploaded file
     */
    id: string;
    /**
     * The kind of the file that was passed in to this component
     */
    kind: string;
    /**
     * Attributes of a file that represent a serialised version of the file.
     */
    fileJSON: FileJSON<Meta>;
}
/**
 * FileUpload component props
 */
export interface Props<Kind extends string = string> {
    /**
     * A file kind that should be registered during plugin startup. See {@link FileServiceStart}.
     */
    kind: Kind;
    /**
     * Allow users to clear a file after uploading.
     *
     * @note this will NOT delete an uploaded file.
     */
    allowClear?: boolean;
    /**
     * Start uploading the file as soon as it is provided
     * by the user.
     */
    immediate?: boolean;
    /**
     * Metadata that you want to associate with any uploaded files
     */
    meta?: Record<string, unknown>;
    /**
     * Whether to display the file picker with width 100%;
     */
    fullWidth?: boolean;
    /**
     * Whether this component should display a "done" state after processing an
     * upload or return to the initial state to allow for another upload.
     *
     * @default false
     */
    allowRepeatedUploads?: boolean;
    /**
     * The initial text prompt
     */
    initialPromptText?: string;
    /**
     * Called when the an upload process fully completes
     */
    onDone: (files: UploadedFile[]) => void;
    /**
     * Called when an error occurs during upload
     */
    onError?: (e: Error) => void;
    /**
     * Will be called whenever an upload starts
     */
    onUploadStart?: () => void;
    /**
     * Will always be called when upload ends, whether success or failure
     */
    onUploadEnd?: () => void;
    /**
     * Whether to display the component in it's compact form.
     *
     * @default false
     *
     * @note passing "true" here implies true for allowRepeatedUplods and immediate.
     */
    compressed?: boolean;
    /**
     * Allow upload more than one file at a time
     *
     * @default false
     */
    multiple?: boolean;
    /**
     * Class name that is passed to the container element
     */
    className?: string;
}
/**
 * This component is intended as a wrapper around EuiFilePicker with some opinions
 * about upload UX. It is optimised for use in modals, flyouts or forms.
 *
 * In order to use this component you must register your file kind with {@link FileKindsRegistry}
 */
export declare const FileUpload: <Kind extends string = string>({ meta, onDone, onError, fullWidth, allowClear, onUploadEnd, onUploadStart, compressed, kind: kindId, multiple, initialPromptText, immediate, allowRepeatedUploads, className, }: Props<Kind>) => ReturnType<FunctionComponent>;
export default FileUpload;

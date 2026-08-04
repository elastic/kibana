import moment from 'moment';
import type { monaco } from '@kbn/code-editor';
interface UseTimePickerPopoverParams {
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    popoverRef: React.MutableRefObject<HTMLDivElement | null>;
}
export declare const useTimePickerPopover: ({ editorRef, popoverRef }: UseTimePickerPopoverParams) => {
    openTimePickerPopover: () => void;
    popoverPosition: {
        top?: number;
        left?: number;
    };
    setPopoverPosition: import("react").Dispatch<import("react").SetStateAction<{
        top?: number;
        left?: number;
    }>>;
    timePickerDate: moment.Moment;
    setTimePickerDate: import("react").Dispatch<import("react").SetStateAction<moment.Moment>>;
    datePickerOpenStatusRef: import("react").MutableRefObject<boolean>;
};
export {};

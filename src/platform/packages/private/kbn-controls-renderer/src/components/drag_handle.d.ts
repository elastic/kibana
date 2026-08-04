interface DragHandleProps {
    isEditable: boolean;
    controlTitle?: string;
    highContrast?: boolean;
    [key: string]: any;
}
export declare const DragHandle: ({ isEditable, controlTitle, children, highContrast, ...rest }: DragHandleProps) => any;
export {};

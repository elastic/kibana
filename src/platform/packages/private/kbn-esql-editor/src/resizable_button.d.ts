import React from 'react';
export declare function ResizableButton({ onMouseDownResizeHandler, onKeyDownResizeHandler, }: {
    onMouseDownResizeHandler: (mouseDownEvent: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.TouchEvent) => void;
    onKeyDownResizeHandler: (keyDownEvernt: React.KeyboardEvent) => void;
    editorIsInline?: boolean;
}): React.JSX.Element;

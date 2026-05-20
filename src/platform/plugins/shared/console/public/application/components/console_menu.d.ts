import React, { Component } from 'react';
import type { NotificationsSetup } from '@kbn/core/public';
interface Props {
    getCurl: () => Promise<string>;
    getDocumentation: () => Promise<string | null>;
    autoIndent: (ev: React.MouseEvent) => void;
    notifications: NotificationsSetup;
}
interface State {
    isPopoverOpen: boolean;
    curlCode: string;
    curlError: Error | null;
}
export declare class ConsoleMenu extends Component<Props, State> {
    constructor(props: Props);
    mouseEnter: () => void;
    copyAsCurl(): Promise<void>;
    copyText(text: string): Promise<void>;
    onButtonClick: () => void;
    closePopover: () => void;
    openDocs: () => Promise<void>;
    autoIndent: (event: React.MouseEvent) => void;
    render(): React.JSX.Element;
}
export {};

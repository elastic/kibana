import React from 'react';
interface NoConnectorMessageProps {
    basePath: {
        prepend: (path: string) => string;
    };
}
export declare function NoConnectorMessage({ basePath }: NoConnectorMessageProps): React.JSX.Element;
export {};

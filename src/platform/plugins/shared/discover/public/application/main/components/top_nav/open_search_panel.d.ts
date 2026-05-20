import React from 'react';
interface OpenSearchPanelProps {
    onClose: () => void;
    onOpenSavedSearch: (id: string) => void;
}
export declare function OpenSearchPanel(props: OpenSearchPanelProps): React.JSX.Element;
export {};

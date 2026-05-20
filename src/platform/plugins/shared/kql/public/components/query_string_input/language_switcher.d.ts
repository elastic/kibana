import type { PopoverAnchorPosition } from '@elastic/eui';
import React from 'react';
import type { DocLinksStart } from '@kbn/core/public';
export declare const strings: {
    getSwitchLanguageButtonText: () => string;
    getFilterLanguageLabel: () => string;
    documentationLabel: () => string;
};
export interface QueryLanguageSwitcherProps {
    language: string;
    onSelectLanguage: (newLanguage: string) => void;
    anchorPosition?: PopoverAnchorPosition;
    nonKqlMode?: 'lucene' | 'text';
    isOnTopBarMenu?: boolean;
    isDisabled?: boolean;
    deps: {
        docLinks: DocLinksStart;
    };
}
export declare const QueryLanguageSwitcher: React.NamedExoticComponent<QueryLanguageSwitcherProps>;

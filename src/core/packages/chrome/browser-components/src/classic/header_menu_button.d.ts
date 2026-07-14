import type { Ref } from 'react';
import React from 'react';
import type { EuiHeaderSectionItemButtonRef } from '@elastic/eui/src/components/header/header_section/header_section_item_button';
interface HeaderMenuButtonProps {
    'aria-controls': string;
    'aria-label': string;
    'aria-expanded': boolean;
    'aria-pressed': boolean;
    'data-test-subj': string;
    onClick: () => void;
    forwardRef: Ref<EuiHeaderSectionItemButtonRef> | undefined;
}
export declare const HeaderMenuButton: React.ForwardRefExoticComponent<HeaderMenuButtonProps & React.RefAttributes<HTMLButtonElement & {
    euiAnimate: () => void;
}>>;
export {};

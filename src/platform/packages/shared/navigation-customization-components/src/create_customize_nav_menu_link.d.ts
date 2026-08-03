import React from 'react';
/**
 * Returns the user-menu link descriptor for the "Customize navigation" entry.
 * The caller passes this to `security.navControlService.addUserMenuLinks`,
 * keeping `SecurityPluginStart` out of this package's imports.
 *
 * The JSX `content` render prop is handled here (not in the navigation plugin)
 * so that all navigation-customization UI stays in one place.
 */
export declare const createCustomizeNavMenuLink: (openModal: () => void) => {
    iconType: "controls";
    label: string;
    href: string;
    order: number;
    content: ({ closePopover }: {
        closePopover: () => void;
    }) => React.ReactNode;
};

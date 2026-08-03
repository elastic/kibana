import React from 'react';
interface HeaderProps {
    canDelete: boolean;
    canViewInApp: boolean;
    viewUrl: string;
    onDeleteClick: () => void;
    title?: string;
}
export declare const Header: ({ canDelete, canViewInApp, viewUrl, onDeleteClick, title }: HeaderProps) => React.JSX.Element;
export {};

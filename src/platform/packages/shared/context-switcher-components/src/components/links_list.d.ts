import React from 'react';
import type { LinksListItem } from './types';
export interface LinksListProps {
    readonly items: ReadonlyArray<LinksListItem>;
}
/**
 * Renders a list of links.
 */
export declare const LinksList: ({ items }: LinksListProps) => React.JSX.Element;

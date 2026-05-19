import type { FC } from 'react';
import type { Tag } from '../types';
export interface Props {
    tag: Tag;
    onClick: (tag: Tag, withModifierKey: boolean) => void;
}
/**
 * The badge representation of a Tag, which is the default display to be used for them.
 */
export declare const TagBadge: FC<Props>;

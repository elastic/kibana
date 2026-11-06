import React from 'react';
import type { ToolbarButtonProps } from '../toolbar_button';
export type Props = Omit<ToolbarButtonProps<'standard'>, 'iconType' | 'label' | 'type'>;
/**
 * A button that acts to add an item from the library to a solution, typically through a modal.
 */
export declare const AddFromLibraryButton: ({ onClick, size, ...rest }: Props) => React.JSX.Element;

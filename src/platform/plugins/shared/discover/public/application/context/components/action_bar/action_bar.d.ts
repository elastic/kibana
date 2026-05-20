import React from 'react';
import { SurrDocType } from '../../services/context';
export interface ActionBarProps {
    /**
     *  the number of documents fetched initially and added when the load button is clicked
     */
    defaultStepSize: number;
    /**
     * the number of docs to be displayed
     */
    docCount: number;
    /**
     *  the number of documents that are  available
     *  display warning when it's lower than docCount
     */
    docCountAvailable: number;
    /**
     * is true while the anchor record is fetched
     */
    isDisabled: boolean;
    /**
     * is true when list entries are fetched
     */
    isLoading: boolean;
    /**
     * is triggered when the input containing count is changed
     * @param type
     * @param count
     */
    onChangeCount: (type: SurrDocType, count: number) => void;
    /**
     * can be `predecessors` or `successors`, usage in context:
     * predecessors action bar + records (these are newer records)
     * anchor record
     * successors records + action bar (these are older records)
     */
    type: SurrDocType;
}
export declare function ActionBar({ defaultStepSize, docCount, docCountAvailable, isDisabled, isLoading, onChangeCount, type, }: ActionBarProps): React.JSX.Element;

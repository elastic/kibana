import type { FC, PropsWithChildren } from 'react';
import React from 'react';
/**
 * A top level wrapper props
 * @public
 */
export interface FieldListProps {
    'data-test-subj'?: string;
    isProcessing: boolean;
    prepend?: React.ReactNode;
    append?: React.ReactNode;
    className?: string;
}
/**
 * A top level wrapper for field list components (filters and field list groups)
 * @param dataTestSubject
 * @param isProcessing
 * @param prepend
 * @param append
 * @param className
 * @param children
 * @public
 * @constructor
 */
export declare const FieldList: FC<PropsWithChildren<FieldListProps>>;

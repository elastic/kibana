import React from 'react';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
interface TypeFieldProps {
    onChange: (type: INDEX_PATTERN_TYPE) => void;
}
export declare const TypeField: ({ onChange }: TypeFieldProps) => React.JSX.Element;
export {};

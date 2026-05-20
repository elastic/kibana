import React from 'react';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { IndexPatternSelectProps } from '.';
export declare function createIndexPatternSelect(indexPatternService: DataViewsContract): (props: IndexPatternSelectProps) => React.JSX.Element;

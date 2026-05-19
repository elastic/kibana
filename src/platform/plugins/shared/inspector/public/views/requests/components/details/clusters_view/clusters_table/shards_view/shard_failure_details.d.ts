import React from 'react';
import type { estypes } from '@elastic/elasticsearch';
/**
 * Provides pretty formatting of a given key string
 * e.g. formats "this_key.is_nice" to "This key is nice"
 * @param key
 */
export declare function formatKey(key: string): string;
/**
 * Adds a EuiCodeBlock to values of  `script` and `script_stack` key
 * Values of other keys are handled a strings
 * @param value
 * @param key
 */
export declare function formatValueByKey(value: unknown, key: string): JSX.Element;
interface Props {
    failure: estypes.ShardFailure;
}
export declare function ShardFailureDetails({ failure }: Props): React.JSX.Element;
export {};

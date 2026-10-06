import React from 'react';
import type { estypes } from '@elastic/elasticsearch';
interface Props {
    failures: estypes.ShardFailure[];
}
export declare function ShardFailureTable({ failures }: Props): React.JSX.Element;
export {};

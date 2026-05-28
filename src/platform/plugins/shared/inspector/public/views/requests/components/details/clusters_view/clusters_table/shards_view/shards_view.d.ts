import React from 'react';
import type { estypes } from '@elastic/elasticsearch';
interface Props {
    failures: estypes.ShardFailure[];
    shardStats?: estypes.ShardStatistics;
}
export declare function ShardsView({ failures, shardStats }: Props): React.JSX.Element | null;
export {};

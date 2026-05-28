import React from 'react';
import type { estypes } from '@elastic/elasticsearch';
interface Props {
    clusters: Record<string, estypes.ClusterDetails>;
}
export declare function ClustersHealth({ clusters }: Props): React.JSX.Element;
export {};

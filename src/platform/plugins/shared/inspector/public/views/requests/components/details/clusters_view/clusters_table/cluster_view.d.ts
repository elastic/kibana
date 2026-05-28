import React from 'react';
import type { estypes } from '@elastic/elasticsearch';
interface Props {
    clusterDetails: estypes.ClusterDetails;
}
export declare function ClusterView({ clusterDetails }: Props): React.JSX.Element;
export {};

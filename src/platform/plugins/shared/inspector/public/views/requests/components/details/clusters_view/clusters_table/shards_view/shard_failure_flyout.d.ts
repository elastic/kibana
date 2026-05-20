import React from 'react';
import type { estypes } from '@elastic/elasticsearch';
interface Props {
    failures: estypes.ShardFailure[];
    onClose: () => void;
}
export declare function ShardFailureFlyout({ failures, onClose }: Props): React.JSX.Element;
export {};

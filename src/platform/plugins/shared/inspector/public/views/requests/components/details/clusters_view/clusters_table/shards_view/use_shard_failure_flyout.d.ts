import React from 'react';
import type { estypes } from '@elastic/elasticsearch';
export declare function useShardFailureFlyout(failures: estypes.ShardFailure[]): {
    triggerLabel: string;
    flyout: React.JSX.Element | null;
    openFlyout: () => void;
    closeFlyout: () => void;
    toggleFlyout: () => void;
};

import type { ReactNode } from 'react';
/**
 * Props to provide to the {@link TrackApplicationView} component.
 * @public
 */
export interface TrackApplicationViewProps {
    /**
     * The name of the view to be tracked. The appId will be obtained automatically.
     * @public
     */
    viewId: string;
    /**
     * The React component to be tracked.
     * @public
     */
    children: ReactNode;
}

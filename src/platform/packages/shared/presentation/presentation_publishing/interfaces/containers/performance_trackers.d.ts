export interface TrackContentfulRender {
    /**
     * A way to report that the contentful render has been completed
     */
    trackContentfulRender: () => void;
}
export declare const canTrackContentfulRender: (root: unknown) => root is TrackContentfulRender;

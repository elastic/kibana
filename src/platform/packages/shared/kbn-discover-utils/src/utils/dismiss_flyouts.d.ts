export declare enum DiscoverFlyouts {
    lensEdit = "lensEdit",
    docViewer = "docViewer",
    esqlDocs = "esqlDocs",
    metricInsights = "metricInsights",
    esqlControls = "esqlControls",
    lensAlertRule = "lensAlertRule",
    inspectorPanel = "inspectorPanel"
}
export declare const dismissFlyouts: (selectedFlyouts?: DiscoverFlyouts[], excludedFlyout?: DiscoverFlyouts) => void;
export declare const dismissAllFlyoutsExceptFor: (excludedFlyout: DiscoverFlyouts) => void;

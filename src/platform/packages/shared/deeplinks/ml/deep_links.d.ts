export declare const ML_APP_ID = "ml";
export type AppId = typeof ML_APP_ID;
export type LinkId = 'overview' | 'anomalyDetection' | 'anomalyExplorer' | 'singleMetricViewer' | 'dataDrift' | 'dataDriftPage' | 'dataFrameAnalytics' | 'resultExplorer' | 'analyticsMap' | 'aiOps' | 'logRateAnalysis' | 'logRateAnalysisPage' | 'logPatternAnalysis' | 'logPatternAnalysisPage' | 'changePointDetections' | 'changePointDetectionsPage' | 'modelManagement' | 'nodesOverview' | 'nodes' | 'memoryUsage' | 'esqlDataVisualizer' | 'dataVisualizer' | 'fileUpload' | 'indexDataVisualizer' | 'settings' | 'calendarSettings' | 'calendarSettings' | 'filterListsSettings' | 'notifications' | 'suppliedConfigurations';
export type DeepLinkId = AppId | `${AppId}:${LinkId}`;

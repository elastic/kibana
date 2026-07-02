export declare function buildExportJsonFilename(filenameBase: string, fileExtension: string): string;
/**
 * Builds a Dev Tools Console request string for creating a dashboard via the dashboards API.
 * The console will open with the HTTP verb + kbn: path, followed by a JSON body.
 */
export declare function buildCreateDashboardRequestForConsole(jsonBody: string): string;

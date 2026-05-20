import type { Observable } from 'rxjs';
import type { StartServices } from '..';
import type { ReportingAPIClient } from '../..';
import type { ReportingPanelProps } from '../share_context_menu/reporting_panel_content';
/**
 * Properties for displaying a share menu with Reporting features.
 */
export interface ApplicationProps {
    /**
     * A function that Reporting calls to get the sharing data from the application.
     * Needed for CSV exports and Canvas PDF reports.
     */
    getJobParams: ReportingPanelProps['getJobParams'];
    /**
     * Option to control how the screenshot(s) is/are placed in the PDF
     */
    layoutOption?: 'canvas' | 'print';
    /**
     * Saved object ID
     */
    objectId?: string;
    /**
     * A function to callback when the Reporting panel should be closed
     */
    onClose: () => void;
}
export interface ReportingPublicComponents {
    /** Needed for Canvas PDF reports */
    ReportingPanelPDFV2(props: ApplicationProps): JSX.Element | null;
    ReportingPanelPNGV2(props: ApplicationProps): JSX.Element | undefined;
}
/**
 * As of 7.14, the only shared component is a PDF report that is suited for Canvas integration.
 * This is not planned to expand, as work is to be done on moving the export-type implementations out of Reporting
 * Related Discuss issue: https://github.com/elastic/kibana/issues/101422
 */
export declare function getSharedComponents(apiClient: ReportingAPIClient, startServices$: Observable<StartServices>): ReportingPublicComponents;

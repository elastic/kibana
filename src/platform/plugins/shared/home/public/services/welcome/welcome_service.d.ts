export type WelcomeRenderTelemetryNotice = () => null | JSX.Element;
export interface WelcomeServiceSetup {
    /**
     * Register listeners to be called when the Welcome component is mounted.
     * It can be called multiple times to register multiple listeners.
     */
    registerOnRendered: (onRendered: () => void) => void;
    /**
     * Register a renderer of the telemetry notice to be shown below the Welcome page.
     */
    registerTelemetryNoticeRenderer: (renderTelemetryNotice: WelcomeRenderTelemetryNotice) => void;
}
export declare class WelcomeService {
    private readonly onRenderedHandlers;
    private renderTelemetryNoticeHandler?;
    setup: () => WelcomeServiceSetup;
    onRendered: () => void;
    renderTelemetryNotice: () => JSX.Element | null;
}

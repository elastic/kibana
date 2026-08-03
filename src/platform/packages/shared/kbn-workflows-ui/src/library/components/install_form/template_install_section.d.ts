import React from 'react';
import type { TemplateBody } from '@kbn/workflows-library';
export interface TemplateInstallSectionProps {
    template: TemplateBody;
    /**
     * Fired when the committed form values change (change for discrete inputs,
     * blur for text inputs) so the host view can refresh the YAML preview.
     */
    onPreviewValuesChange?: (values: Record<string, unknown>) => void;
    /**
     * The rendered template YAML currently shown in the preview (committed form
     * values applied). "Remix with AI" hands exactly this string to the workflow
     * editor, so what the user sees is what they remix.
     */
    previewYaml: string;
}
/**
 * The installation part of the template detail view: the `install.form`
 * fields, the Install button (enabled once every required field is filled),
 * the install call itself, and the "Remix with AI" action that opens the
 * rendered template in the workflow editor (via `WorkflowsCreateRouteState`
 * history state — no template knowledge in the editor). Works out of the box
 * in any host plugin — the HTTP client comes from `useKibana().services.http`,
 * connector services from `WorkflowsUiServicesProvider`. On success it shows
 * a toast and navigates to the created workflow's editor page.
 */
export declare const TemplateInstallSection: React.NamedExoticComponent<TemplateInstallSectionProps>;

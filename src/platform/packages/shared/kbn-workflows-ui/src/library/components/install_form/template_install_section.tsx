/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import type { ApplicationStart, NotificationsStart } from '@kbn/core/public';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { validateInstallFormValues } from '@kbn/workflows-library';
import type { InstallFormField, TemplateBody } from '@kbn/workflows-library';
import { InstallForm } from './install_form';
import { TemplateRequirements } from './template_requirements';
import { useWorkflowsCapabilities } from '../../../hooks/use_workflows_capabilities';
import type { WorkflowsCreateRouteState } from '../../../navigation';
import { type InstallSource, useInstallTemplate } from '../../hooks/use_install_template';

/**
 * The two steps of the template detail view: the template's summary
 * (`details`) and the install-form configuration (`setup`).
 */
export type TemplateInstallStep = 'details' | 'setup';

export interface TemplateInstallSectionProps {
  template: TemplateBody;
  /** Which step to render. Owned by the host view (`TemplateDetail`). */
  step: TemplateInstallStep;
  /** Requests a step change — fired by "Set up workflow". */
  onStepChange: (step: TemplateInstallStep) => void;
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
  /**
   * Where the template came from. `'catalog'` (default) installs by slug (the
   * server re-fetches the trusted template); `'custom'` installs the template's
   * own raw YAML (e.g. an uploaded file with no catalog slug).
   */
  installMode?: 'catalog' | 'custom';
}

const defaultsFromForm = (fields: InstallFormField[]): Record<string, unknown> =>
  Object.fromEntries(
    fields
      .filter((field) => field.default !== undefined)
      .map((field) => [field.name, field.default])
  );

/**
 * The installation part of the template detail view, rendered per step: a
 * "What you'll need" summary plus "Set up workflow" on `details`, the
 * `install.form` fields plus the Install button (enabled once every required
 * field is filled) on `setup`. Templates with nothing to configure skip the
 * setup step and offer Install straight away. Both steps offer "Remix with AI",
 * which opens the rendered template in the workflow editor (via
 * `WorkflowsCreateRouteState` history state — no template knowledge in the
 * editor). Form state lives here, so it survives moving between steps as long
 * as the host keeps this component mounted. Works out of the box in any host
 * plugin — the HTTP client comes from `useKibana().services.http`, connector
 * services from `WorkflowsUiServicesProvider`. On success it shows a toast and
 * navigates to the created workflow's editor page.
 */
export const TemplateInstallSection = React.memo<TemplateInstallSectionProps>(
  function TemplateInstallSection({
    template,
    step,
    onStepChange,
    onPreviewValuesChange,
    previewYaml,
    installMode = 'catalog',
  }) {
    const { euiTheme } = useEuiTheme();
    const { application, notifications } = useKibana<{
      application: ApplicationStart;
      notifications: NotificationsStart;
    }>().services;
    const { canCreateWorkflow } = useWorkflowsCapabilities();

    const fields = useMemo(
      () => template.metadata.install?.form ?? [],
      [template.metadata.install]
    );

    const [values, setValues] = useState<Record<string, unknown>>(() => defaultsFromForm(fields));
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
    const [installError, setInstallError] = useState<string | undefined>();

    const clientErrors = useMemo(() => {
      const errors: Record<string, string> = {};
      for (const { field, reason } of validateInstallFormValues(fields, values)) {
        errors[field] = reason;
      }
      return errors;
    }, [fields, values]);

    // Client errors only surface on touched fields (a pristine form isn't
    // red); server errors always surface — they exist because a submit failed.
    const visibleErrors = useMemo(() => {
      const errors: Record<string, string | undefined> = {};
      for (const field of fields) {
        errors[field.name] =
          serverErrors[field.name] ?? (touched[field.name] ? clientErrors[field.name] : undefined);
      }
      return errors;
    }, [fields, touched, clientErrors, serverErrors]);

    const handleChange = useCallback((name: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      setServerErrors((prev) => {
        if (!(name in prev)) return prev;
        const { [name]: _cleared, ...rest } = prev;
        return rest;
      });
    }, []);

    const handleCommit = useCallback(
      (name: string, value: unknown) => {
        const next = { ...values, [name]: value };
        setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
        setValues(next);
        onPreviewValuesChange?.(next);
      },
      [onPreviewValuesChange, values]
    );

    const installSource = useMemo<InstallSource>(
      () =>
        installMode === 'custom'
          ? { type: 'custom', yaml: template.raw }
          : { type: 'catalog', slug: template.metadata.slug },
      [installMode, template.raw, template.metadata.slug]
    );

    const { mutate: installTemplate, isLoading: isInstalling } = useInstallTemplate(installSource, {
      onSuccess: ({ workflowId }) => {
        notifications.toasts.addSuccess(
          i18n.translate('workflows.library.install.successToast', {
            defaultMessage: 'Workflow created from "{name}"',
            values: { name: template.metadata.name },
          })
        );
        void application.navigateToApp(WORKFLOWS_APP_ID, { path: `/${workflowId}` });
      },
      onError: (error) => {
        const attributes = error.body?.attributes as
          | { errors?: Array<{ field: string; reason: string }> }
          | undefined;
        if (attributes?.errors?.length) {
          setServerErrors(
            Object.fromEntries(attributes.errors.map(({ field, reason }) => [field, reason]))
          );
        }
        setInstallError(error.body?.message ?? error.message);
      },
    });

    const handleInstall = useCallback(() => {
      setInstallError(undefined);
      setServerErrors({});
      installTemplate(values);
    }, [installTemplate, values]);

    // Opens the workflow editor seeded with the previewed YAML, via the
    // create page's history-state contract (`WorkflowsCreateRouteState`).
    // Deliberately not gated on form validation: it is the escape hatch for
    // finishing the configuration in the editor — unset fields carry their
    // defaults or `<name>` placeholders.
    const handleRemix = useCallback(() => {
      void application.navigateToApp(WORKFLOWS_APP_ID, {
        path: '/create',
        state: { initialYaml: previewYaml } satisfies WorkflowsCreateRouteState,
      });
    }, [application, previewYaml]);

    const handleSetup = useCallback(() => onStepChange('setup'), [onStepChange]);

    if (!canCreateWorkflow) {
      // Without the create privilege the install (and any secondary create
      // path) can't succeed — mirror the workflow list and render no actions.
      return null;
    }

    const isSetupStep = step === 'setup';
    const hasForm = fields.length > 0;
    // Nothing to configure means no setup step to send the user to.
    const showInstall = isSetupStep || !hasForm;

    const missingFields = Object.keys(clientErrors);
    const installDisabled = missingFields.length > 0;

    const installButton = (
      <EuiButton
        fill
        fullWidth
        isLoading={isInstalling}
        disabled={installDisabled}
        onClick={handleInstall}
        data-test-subj="workflowLibraryTemplateInstallButton"
      >
        {i18n.translate('workflows.library.install.installButton', {
          defaultMessage: 'Install',
        })}
      </EuiButton>
    );

    const installAction = installDisabled ? (
      <EuiToolTip
        display="block"
        position="top"
        content={i18n.translate('workflows.library.install.disabledTooltip', {
          defaultMessage:
            'Fill in the required {count, plural, one {field} other {fields}} to install: {fields}',
          values: {
            count: missingFields.length,
            fields: missingFields.join(', '),
          },
        })}
      >
        {installButton}
      </EuiToolTip>
    ) : (
      installButton
    );

    const setupButton = (
      <EuiButton
        fill
        fullWidth
        onClick={handleSetup}
        data-test-subj="workflowLibraryTemplateSetupButton"
      >
        {i18n.translate('workflows.library.install.setupButton', {
          defaultMessage: 'Set up workflow',
        })}
      </EuiButton>
    );

    return (
      <>
        {/* No internal scroll: the step content scrolls together with the rest
            of the left column (see `leftStack` in `template_detail.tsx`). */}
        {isSetupStep ? (
          <EuiFlexItem grow={false}>
            <InstallForm
              fields={fields}
              values={values}
              errors={visibleErrors}
              onChange={handleChange}
              onCommit={handleCommit}
            />
          </EuiFlexItem>
        ) : null}

        {!isSetupStep && hasForm ? (
          <EuiFlexItem grow={false}>
            <TemplateRequirements fields={fields} />
          </EuiFlexItem>
        ) : null}

        <EuiFlexItem
          grow={false}
          css={css({ marginTop: 'auto', paddingTop: euiTheme.size.l })}
          data-test-subj="workflowLibraryTemplateInstallActions"
        >
          {installError ? (
            <>
              <KbnDangerCallout
                size="s"
                title={i18n.translate('workflows.library.install.errorTitle', {
                  defaultMessage: 'The template could not be installed',
                })}
                data-test-subj="workflowLibraryTemplateInstallError"
              >
                {installError}
              </KbnDangerCallout>
              <EuiSpacer size="s" />
            </>
          ) : null}

          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem>
              <AiButton
                variant="base"
                fullWidth
                iconType="productAgent"
                onClick={handleRemix}
                data-test-subj="workflowLibraryTemplateRemixButton"
              >
                {i18n.translate('workflows.library.install.remixButton', {
                  defaultMessage: 'Remix with AI',
                })}
              </AiButton>
            </EuiFlexItem>
            <EuiFlexItem>{showInstall ? installAction : setupButton}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </>
    );
  }
);
TemplateInstallSection.displayName = 'TemplateInstallSection';

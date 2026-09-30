/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  useEuiShadow,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ensureWorkflowGraphEuiIcons,
  WORKFLOWS_CANVAS_CHROME_INSET,
  WORKFLOWS_SURFACE_RADIUS,
} from '@kbn/workflows-ui';
import { CANVAS_CONFIG_PANEL_MARGIN } from './canvas_config_panel_shell';
import { useWorkflowSettingsDraft } from './use_workflow_settings_draft';
import {
  WorkflowConstantsEditor,
  type SettingsEditorAddControls,
} from '../../../pages/workflow_detail/ui/workflow_constants_editor';
import { WorkflowOutputsEditor } from '../../../pages/workflow_detail/ui/workflow_outputs_editor';

ensureWorkflowGraphEuiIcons();

type SectionId = 'details' | 'constants' | 'outputs';

/**
 * Space reserved under the popover so it never covers the canvas zoom cluster
 * (bottom-left Panel margin + control chrome) and keeps a 16px gap above it.
 * Matches `WORKFLOWS_CANVAS_CHROME_INSET` + ~4× `EuiButtonIcon` size s + padding.
 */
const ZOOM_CONTROLS_HEIGHT_PX = 148;
const GAP_ABOVE_ZOOM_CONTROLS_PX = WORKFLOWS_CANVAS_CHROME_INSET;

const sectionStorageKey = (workflowId: string | undefined): string =>
  `workflows.settingsC.sections.${workflowId ?? 'new'}`;

const DEFAULT_OPEN: Record<SectionId, boolean> = {
  details: true,
  constants: true,
  outputs: true,
};

const readSectionState = (workflowId: string | undefined): Record<SectionId, boolean> => {
  try {
    const raw = sessionStorage.getItem(sectionStorageKey(workflowId));
    if (!raw) return { ...DEFAULT_OPEN };
    const parsed = JSON.parse(raw) as Partial<Record<SectionId, boolean>>;
    return { ...DEFAULT_OPEN, ...parsed };
  } catch {
    return { ...DEFAULT_OPEN };
  }
};

export interface WorkflowSettingsCSurfaceProps {
  readonly workflowId: string | undefined;
  readonly readOnly?: boolean;
  /** Canvas height used to cap popover so it stays within graph bounds. */
  readonly canvasHeight: number;
}

/**
 * Option C: discoverable launcher → collapsible popover with Information /
 * Constants / Outputs. Reuses the same const/output editors (canonical rows).
 */
export function WorkflowSettingsCSurface({
  workflowId,
  readOnly = false,
  canvasHeight,
}: WorkflowSettingsCSurfaceProps) {
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('m');
  const [expanded, setExpanded] = useState(false);
  const [sections, setSections] = useState(() => readSectionState(workflowId));
  const [discardDraftSignal, setDiscardDraftSignal] = useState(0);
  const [constantsAdd, setConstantsAdd] = useState<SettingsEditorAddControls | null>(null);
  const [outputsAdd, setOutputsAdd] = useState<SettingsEditorAddControls | null>(null);

  const draft = useWorkflowSettingsDraft({
    hydrateKey: expanded ? `open:${workflowId ?? 'new'}` : false,
    readOnly,
  });

  useEffect(() => {
    setSections(readSectionState(workflowId));
  }, [workflowId]);

  const persistSections = useCallback(
    (next: Record<SectionId, boolean>) => {
      setSections(next);
      try {
        sessionStorage.setItem(sectionStorageKey(workflowId), JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [workflowId]
  );

  const toggleSection = useCallback(
    (id: SectionId) => {
      persistSections({ ...sections, [id]: !sections[id] });
    },
    [persistSections, sections]
  );

  const ensureSectionOpen = useCallback(
    (id: SectionId) => {
      if (!sections[id]) {
        persistSections({ ...sections, [id]: true });
      }
    },
    [persistSections, sections]
  );

  const collapse = useCallback(() => {
    setDiscardDraftSignal((n) => n + 1);
    setExpanded(false);
  }, []);

  const constantsExtraAction = useMemo(() => {
    if (readOnly || !constantsAdd) return undefined;
    return (
      <EuiButtonEmpty
        size="xs"
        flush="both"
        color="primary"
        iconType="plusCircle"
        isDisabled={constantsAdd.disabled}
        onClick={(e) => {
          e.stopPropagation();
          ensureSectionOpen('constants');
          constantsAdd.onAdd();
        }}
        data-test-subj="workflowSettingsConstAdd"
      >
        {i18n.translate('workflows.workflowSettingsFlyout.addConstant', {
          defaultMessage: 'Add constant',
        })}
      </EuiButtonEmpty>
    );
  }, [readOnly, constantsAdd, ensureSectionOpen]);

  const outputsExtraAction = useMemo(() => {
    if (readOnly || !outputsAdd) return undefined;
    return (
      <EuiButtonEmpty
        size="xs"
        flush="both"
        color="primary"
        iconType="plusCircle"
        isDisabled={outputsAdd.disabled}
        onClick={(e) => {
          e.stopPropagation();
          ensureSectionOpen('outputs');
          outputsAdd.onAdd();
        }}
        data-test-subj="workflowSettingsOutputAdd"
      >
        {i18n.translate('workflows.workflowSettingsFlyout.addOutput', {
          defaultMessage: 'Add output',
        })}
      </EuiButtonEmpty>
    );
  }, [readOnly, outputsAdd, ensureSectionOpen]);

  const tagOptions = useMemo(
    (): Array<EuiComboBoxOptionOption<string>> => draft.tags.map((label) => ({ label })),
    [draft.tags]
  );

  // Top inset + gap above zoom + zoom chrome + zoom bottom inset.
  const maxPanelHeight = Math.max(
    200,
    canvasHeight -
      CANVAS_CONFIG_PANEL_MARGIN -
      GAP_ABOVE_ZOOM_CONTROLS_PX -
      ZOOM_CONTROLS_HEIGHT_PX -
      WORKFLOWS_CANVAS_CHROME_INSET
  );
  const collapseLabel = i18n.translate('workflows.settingsSurface.c.collapse', {
    defaultMessage: 'Collapse workflow settings',
  });

  if (!expanded) {
    return (
      <div
        css={[
          {
            position: 'absolute',
            top: CANVAS_CONFIG_PANEL_MARGIN,
            left: CANVAS_CONFIG_PANEL_MARGIN,
            zIndex: 6,
            // Same floating chrome as canvas zoom controls / minimap.
            background: euiTheme.colors.backgroundBasePlain,
            borderRadius: WORKFLOWS_SURFACE_RADIUS,
            padding: euiTheme.size.s, // 8px
          },
          shadow,
        ]}
      >
        <EuiButton
          size="s"
          color="text"
          iconType="gear"
          onClick={() => setExpanded(true)}
          data-test-subj="workflowSettingsCLauncher"
          css={{
            // Chrome shell owns the border/shadow — keep the button flush.
            '&&': {
              minWidth: 0,
              border: 'none',
              boxShadow: 'none',
              background: 'transparent',
            },
          }}
        >
          {i18n.translate('workflows.settingsSurface.c.launcher', {
            defaultMessage: 'Workflow settings',
          })}
        </EuiButton>
      </div>
    );
  }

  return (
    <div
      data-test-subj="workflowSettingsCPopover"
      css={[
        {
          position: 'absolute',
          top: CANVAS_CONFIG_PANEL_MARGIN,
          left: CANVAS_CONFIG_PANEL_MARGIN,
          zIndex: 11,
          width: 340,
          maxHeight: maxPanelHeight,
          background: euiTheme.colors.backgroundBasePlain,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
          borderRadius: WORKFLOWS_SURFACE_RADIUS,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
        shadow,
      ]}
    >
      <div
        css={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: euiTheme.size.s,
          // Match collapsed launcher chrome: size.s padding + EuiButton size="s" (32px).
          boxSizing: 'border-box',
          minHeight: `calc(${euiTheme.size.s} * 2 + 32px)`,
          paddingBlock: euiTheme.size.s,
          paddingInline: `${euiTheme.size.base} ${euiTheme.size.s}`,
          borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
        }}
      >
        <EuiTitle size="xxs">
          <h2
            css={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: euiTheme.size.s,
            }}
            data-test-subj="workflowSettingsCTitle"
          >
            <EuiIcon type="gear" size="m" aria-hidden />
            {i18n.translate('workflows.settingsSurface.c.launcher', {
              defaultMessage: 'Workflow settings',
            })}
          </h2>
        </EuiTitle>
        <EuiToolTip content={collapseLabel} position="left" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="minus"
            color="text"
            aria-label={collapseLabel}
            onClick={collapse}
            data-test-subj="workflowSettingsCCollapse"
          />
        </EuiToolTip>
      </div>

      <div
        css={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          padding: `${euiTheme.size.m} ${euiTheme.size.base} ${euiTheme.size.base}`,
        }}
      >
        <Section
          id="details"
          title={i18n.translate('workflows.settingsSurface.c.details', {
            defaultMessage: 'Information',
          })}
          open={sections.details}
          onToggle={() => toggleSection('details')}
        >
          <EuiFormRow
            fullWidth
            compressed
            label={i18n.translate('workflows.workflowSettingsFlyout.nameLabel', {
              defaultMessage: 'Workflow name',
            })}
          >
            <EuiFieldText
              fullWidth
              compressed
              value={draft.name}
              disabled={readOnly}
              onChange={(e) => draft.setName(e.target.value)}
              onBlur={() => {
                const next = draft.name.trim();
                if (next) draft.applyYamlPatch({ name: next });
              }}
              data-test-subj="workflowSettingsCNameInput"
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            compressed
            label={i18n.translate('workflows.workflowSettingsFlyout.descriptionLabel', {
              defaultMessage: 'Description',
            })}
          >
            <EuiTextArea
              fullWidth
              compressed
              rows={3}
              resize="none"
              value={draft.description}
              disabled={readOnly}
              onChange={(e) => draft.setDescription(e.target.value)}
              onBlur={() => {
                if (readOnly) return;
                draft.applyYamlPatch({ description: draft.description.trim() });
              }}
              data-test-subj="workflowSettingsCDescriptionInput"
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiComboBox
            fullWidth
            compressed
            aria-label={i18n.translate('workflows.workflowSettingsFlyout.tagsLabel', {
              defaultMessage: 'Tags',
            })}
            selectedOptions={tagOptions}
            onChange={(selected) => {
              const next = selected.map((o) => o.label);
              draft.setTags(next);
              draft.applyYamlPatch({ tags: next });
            }}
            onCreateOption={(searchValue) => {
              const normalized = searchValue.trim();
              if (!normalized || draft.tags.includes(normalized)) return;
              const next = [...draft.tags, normalized];
              draft.setTags(next);
              draft.applyYamlPatch({ tags: next });
            }}
            isDisabled={readOnly}
            data-test-subj="workflowSettingsCTagsInput"
          />
        </Section>

        <Section
          id="constants"
          title={i18n.translate('workflows.settingsSurface.c.constants', {
            defaultMessage: 'Constants',
          })}
          count={draft.constantFields.length}
          open={sections.constants}
          onToggle={() => toggleSection('constants')}
          extraAction={constantsExtraAction}
        >
          <WorkflowConstantsEditor
            fields={draft.constantFields}
            onChange={draft.handleConstantsChange}
            findReferencingSteps={draft.findConstRefs}
            readOnly={readOnly}
            discardDraftSignal={discardDraftSignal}
            hideInlineAddButton={true}
            onAddControlsChange={setConstantsAdd}
          />
        </Section>

        <Section
          id="outputs"
          title={i18n.translate('workflows.settingsSurface.c.outputs', {
            defaultMessage: 'Outputs',
          })}
          count={draft.outputFields.length}
          open={sections.outputs}
          onToggle={() => toggleSection('outputs')}
          extraAction={outputsExtraAction}
        >
          <WorkflowOutputsEditor
            fields={draft.outputFields}
            onChange={draft.handleOutputsChange}
            workflowDefinition={draft.definition}
            connectors={draft.connectors}
            findReferencingSteps={draft.findOutputRefs}
            readOnly={readOnly}
            discardDraftSignal={discardDraftSignal}
            hideInlineAddButton={true}
            onAddControlsChange={setOutputsAdd}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  count,
  open,
  onToggle,
  extraAction,
  children,
}: {
  readonly id: SectionId;
  readonly title: string;
  readonly count?: number;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly extraAction?: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: `workflowSettingsCSection-${id}` });

  return (
    <div
      data-test-subj={`workflowSettingsCSection-${id}`}
      css={{
        borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
        marginTop: euiTheme.size.m,
        paddingTop: euiTheme.size.m,
        '&:first-child': {
          borderTop: 'none',
          marginTop: 0,
          paddingTop: 0,
        },
      }}
    >
      <EuiAccordion
        id={accordionId}
        forceState={open ? 'open' : 'closed'}
        onToggle={onToggle}
        paddingSize="none"
        arrowDisplay="left"
        buttonContent={
          <EuiTitle size="xxs">
            <h4>
              {title}
              {count != null ? (
                <span
                  css={{
                    color: euiTheme.colors.textSubdued,
                    fontWeight: euiTheme.font.weight.regular,
                  }}
                >
                  {` · ${count}`}
                </span>
              ) : null}
            </h4>
          </EuiTitle>
        }
        extraAction={extraAction}
        data-test-subj={`workflowSettingsCSectionToggle-${id}`}
      >
        <div css={{ paddingTop: euiTheme.size.m }}>{children}</div>
      </EuiAccordion>
    </div>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';

import {
  EuiButtonIcon,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { MAX_ARTIFACTS_INVESTIGATION_GUIDE_LENGTH } from '@kbn/alerting-types/rule/latest';
import {
  RULE_INVESTIGATION_GUIDE_LABEL,
  RULE_INVESTIGATION_GUIDE_LABEL_TOOLTIP_CONTENT,
  RULE_NAME_INPUT_TITLE,
  RULE_TAG_COPY_LABEL,
  RULE_TAG_INPUT_TITLE,
  RULE_TAG_PLACEHOLDER,
} from '../translations';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';
import { OptionalFieldLabel } from '../optional_field_label';
import { InvestigationGuideEditor } from './rule_investigation_guide_editor';
import { RuleDashboards } from './rule_dashboards';
import { LabelWithTooltip } from './label_with_tooltip';

export const RULE_DETAIL_MIN_ROW_WIDTH = 600;

export const RuleDetails = () => {
  const { euiTheme } = useEuiTheme();
  const { formData, baseErrors, plugins } = useRuleFormState();
  const { uiActions } = plugins;

  const dispatch = useRuleFormDispatch();

  const { tags = [], name } = formData;

  const tagsOptions = useMemo(() => {
    return tags.map((tag: string) => ({ label: tag }));
  }, [tags]);

  const onNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: 'setName',
        payload: e.target.value,
      });
    },
    [dispatch]
  );

  const addTags = useCallback(
    (values: string[]) => {
      const merged = [...tags];
      // De-duplicate case-insensitively (against existing tags and within the batch),
      // preserving the casing of the first occurrence. Keeps `Prod`/`prod` from both landing.
      const seen = new Set(tags.map((tag) => tag.trim().toLowerCase()));
      values.forEach((value) => {
        const trimmed = value.trim();
        const normalized = trimmed.toLowerCase();
        if (trimmed.length > 0 && !seen.has(normalized)) {
          seen.add(normalized);
          merged.push(trimmed);
        }
      });

      if (merged.length === tags.length) {
        return;
      }

      dispatch({
        type: 'setTags',
        payload: merged,
      });
    },
    [dispatch, tags]
  );

  const onAddTag = useCallback((searchValue: string) => addTags(searchValue.split(',')), [addTags]);

  const onPasteTags = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      // Tags copied from badges arrive newline-separated on the clipboard, but the
      // single-line input would collapse them into one tag. Read the raw clipboard
      // and split on newlines/commas before the input sanitizes the value.
      const text = e.clipboardData.getData('text');
      if (!/[\n\r,]/.test(text)) {
        return;
      }
      e.preventDefault();
      addTags(text.split(/[\n\r,]+/));
    },
    [addTags]
  );

  const onSetTag = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      dispatch({
        type: 'setTags',
        payload: options.map((selectedOption) => selectedOption.label),
      });
    },
    [dispatch]
  );

  const onBlur = useCallback(() => {
    if (!tags) {
      dispatch({
        type: 'setTags',
        payload: [],
      });
    }
  }, [dispatch, tags]);

  const onSetArtifacts = useCallback(
    (value: object) => {
      dispatch({
        type: 'setRuleProperty',
        payload: {
          property: 'artifacts',
          value: formData.artifacts ? { ...formData.artifacts, ...value } : value,
        },
      });
    },
    [dispatch, formData.artifacts]
  );

  const flexItemCss = css`
    min-width: 0;
  `;

  // The xs copy button is taller than the label text, which would grow the Tags
  // label row and push its input below the Rule name input. Collapse the extra
  // height so both inputs stay aligned.
  const copyButtonCss = css`
    margin-block: -${euiTheme.size.xs};
  `;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={1} css={flexItemCss}>
          <EuiFormRow
            data-test-subj="ruleDetails"
            fullWidth
            label={RULE_NAME_INPUT_TITLE}
            isInvalid={!!baseErrors?.name?.length}
            error={baseErrors?.name}
          >
            <EuiFieldText
              fullWidth
              value={name}
              placeholder={RULE_NAME_INPUT_TITLE}
              onChange={onNameChange}
              data-test-subj="ruleDetailsNameInput"
              isInvalid={!!baseErrors?.name?.length}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={1} css={flexItemCss}>
          <EuiFormRow
            fullWidth
            label={RULE_TAG_INPUT_TITLE}
            labelAppend={
              <EuiFlexGroup
                gutterSize="s"
                responsive={false}
                alignItems="center"
                justifyContent="flexEnd"
              >
                <EuiFlexItem grow={false}>{OptionalFieldLabel}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={tags.join('\n')}>
                    {(copy) => (
                      <EuiToolTip content={RULE_TAG_COPY_LABEL} disableScreenReaderOutput>
                        <EuiButtonIcon
                          css={copyButtonCss}
                          iconType="copyClipboard"
                          size="xs"
                          color="text"
                          onClick={copy}
                          isDisabled={tags.length === 0}
                          data-test-subj="ruleDetailsTagsCopyButton"
                          aria-label={RULE_TAG_COPY_LABEL}
                        />
                      </EuiToolTip>
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            isInvalid={!!baseErrors?.tags?.length}
            error={baseErrors?.tags}
          >
            <EuiComboBox
              isInvalid={!!baseErrors?.tags?.length}
              fullWidth
              noSuggestions
              placeholder={RULE_TAG_PLACEHOLDER}
              data-test-subj="ruleDetailsTagsInput"
              selectedOptions={tagsOptions}
              onCreateOption={onAddTag}
              onChange={onSetTag}
              onBlur={onBlur}
              onPaste={onPasteTags}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiFormRow
        fullWidth
        label={
          <LabelWithTooltip
            labelContent={RULE_INVESTIGATION_GUIDE_LABEL}
            tooltipContent={RULE_INVESTIGATION_GUIDE_LABEL_TOOLTIP_CONTENT}
          />
        }
        labelAppend={OptionalFieldLabel}
        isInvalid={
          (formData.artifacts?.investigation_guide?.blob?.length ?? 0) >
          MAX_ARTIFACTS_INVESTIGATION_GUIDE_LENGTH
        }
      >
        <InvestigationGuideEditor
          setRuleParams={onSetArtifacts}
          value={formData.artifacts?.investigation_guide?.blob ?? ''}
        />
      </EuiFormRow>
      {uiActions && <RuleDashboards uiActions={uiActions} />}
      <EuiSpacer size="xxl" />
    </>
  );
};

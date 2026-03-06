/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, type ChangeEvent, type FormEvent } from 'react';

import { EuiButton, EuiFormRow, EuiFieldText, EuiText, useGeneratedHtmlId } from '@elastic/eui';

import {
  PanelContainer,
  PanelHeader,
  PanelBody,
  PanelBodySection,
  PanelFooter,
  SubPanelHeading,
} from '../date_range_picker_panel_ui';
import { useDateRangePickerContext } from '../date_range_picker_context';
import { useDateRangePickerPanelNavigation } from '../date_range_picker_panel_navigation';

/**
 * A panel to demo how panels can be structured.
 * To see it, navigate to it from another panel with `navigateTo`
 *
 * @example
 * ```js
 * const { navigateTo } = useDateRangePickerPanelNavigation();
 * navigateTo(ExamplePanel.PANEL_ID);
 * ```
 */
export function ExamplePanel() {
  const { text, setText, applyRange } = useDateRangePickerContext();
  const { navigateTo } = useDateRangePickerPanelNavigation();

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value),
    [setText]
  );

  const formId = useGeneratedHtmlId({ prefix: 'examplePanelForm' });

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      applyRange();
    },
    [applyRange]
  );

  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading>Example panel</SubPanelHeading>
      </PanelHeader>
      <PanelBody>
        <PanelBodySection>
          <EuiText size="s">
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. At nostrum recusandae
              reprehenderit porro, repellendus neque hic dicta architecto
            </p>
          </EuiText>
        </PanelBodySection>
        <PanelBodySection spacingSide="both">
          <form id={formId} onSubmit={onSubmit}>
            <EuiFormRow label="Same as above" helpText="Hit Enter or click Apply">
              <EuiFieldText value={text} onChange={onInputChange} compressed />
            </EuiFormRow>
          </form>
        </PanelBodySection>
        <PanelBodySection>
          <EuiButton size="s" fullWidth onClick={() => navigateTo(ExampleNestedPanel.PANEL_ID)}>
            Go to Example panel, nested
          </EuiButton>
        </PanelBodySection>
      </PanelBody>
      <PanelFooter
        primaryAction={
          <EuiButton size="s" fill type="submit" form={formId}>
            Apply
          </EuiButton>
        }
      >
        <EuiText size="xs" component="p">
          Some secondary action
        </EuiText>
      </PanelFooter>
    </PanelContainer>
  );
}
ExamplePanel.PANEL_ID = 'example-panel';

/**
 * A second example panel with dummy content, used to demo navigation history
 * (navigating forward and going back between panels).
 */
export function ExampleNestedPanel() {
  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading>Example panel, nested</SubPanelHeading>
      </PanelHeader>
      <PanelBody>
        <PanelBodySection>
          <EuiText size="s">
            <p>This is the second example panel.</p>
          </EuiText>
        </PanelBodySection>
      </PanelBody>
    </PanelContainer>
  );
}
ExampleNestedPanel.PANEL_ID = 'example-panel-nested';

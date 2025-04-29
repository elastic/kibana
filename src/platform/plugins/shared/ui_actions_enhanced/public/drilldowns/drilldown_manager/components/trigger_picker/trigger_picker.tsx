/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText, EuiToolTip, EuiFormFieldset, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TriggerPickerItemDescription, TriggerPickerItem } from './trigger_picker_item';

const txtTriggerPickerLabel = i18n.translate(
  'uiActionsEnhanced.components.actionWizard.triggerPickerLabel',
  {
    defaultMessage: 'Show option on:',
  }
);

const txtTriggerPickerHelpText = i18n.translate(
  'uiActionsEnhanced.components.actionWizard.triggerPickerHelpText',
  {
    defaultMessage: "What's this?",
  }
);

const txtTriggerPickerHelpTooltip = i18n.translate(
  'uiActionsEnhanced.components.actionWizard.triggerPickerHelpTooltip',
  {
    defaultMessage: 'Determines when the drilldown appears in context menu',
  }
);

export interface TriggerPickerProps {
  /** List of available triggers. */
  items: TriggerPickerItemDescription[];

  /** List of IDs of selected triggers. */
  selected?: string[];

  /** Link to documentation. */
  docs?: string;

  /** Whether user interactions should be disabled. */
  disabled?: boolean;

  /** Called on trigger selection change. */
  onChange: (selected: string[]) => void;
}

export const TriggerPicker: React.FC<TriggerPickerProps> = ({
  items,
  selected = [],
  docs,
  disabled,
  onChange,
}) => {
  return (
    <EuiFormFieldset
      data-test-subj={`triggerPicker`}
      legend={{
        children: !!docs && (
          <EuiText size="s">
            <h5>
              <span>{txtTriggerPickerLabel}</span>{' '}
              <EuiToolTip content={txtTriggerPickerHelpTooltip}>
                <EuiLink href={docs} target={'blank'} external>
                  {txtTriggerPickerHelpText}
                </EuiLink>
              </EuiToolTip>
            </h5>
          </EuiText>
        ),
      }}
      css={{ maxWidth: `80%` }}
    >
      {items.map((trigger) => (
        <TriggerPickerItem
          key={trigger.id}
          id={trigger.id}
          title={trigger.title}
          description={trigger.description}
          checked={trigger.id === selected[0]}
          disabled={disabled}
          onSelect={(id) => onChange([id])}
        />
      ))}
    </EuiFormFieldset>
  );
};

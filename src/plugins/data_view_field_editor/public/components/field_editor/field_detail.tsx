/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';
import { AdvancedParametersSection } from './advanced_parameters_section';
import { FormRow } from './form_row';
import {
  PopularityField,
  FormatField,
  ScriptField,
  CustomLabelField,
  CustomDescriptionField,
} from './form_fields';
import { useFieldEditorContext } from '../field_editor_context';

const geti18nTexts = (): {
  [key: string]: { title: string; description: JSX.Element | string };
} => ({
  customLabel: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.customLabelTitle', {
      defaultMessage: 'Set custom label',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.customLabelDescription', {
      defaultMessage: `Create a label to display in place of the field name in Discover, Maps, Lens, Visualize, and TSVB. Useful for shortening a long field name. Queries and filters use the original field name.`,
    }),
  },
  customDescription: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.customDescriptionTitle', {
      defaultMessage: 'Set custom description',
    }),
    description: i18n.translate(
      'indexPatternFieldEditor.editor.form.customDescriptionDescription',
      {
        defaultMessage:
          "Add a description to the field. It's displayed next to the field on the Discover, Lens, and Data View Management pages.",
      }
    ),
  },
  value: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.valueTitle', {
      defaultMessage: 'Set value',
    }),
    description: (
      <FormattedMessage
        id="indexPatternFieldEditor.editor.form.valueDescription"
        defaultMessage="Set a value for the field instead of retrieving it from the field with the same name in {source}."
        values={{
          source: <EuiCode>{'_source'}</EuiCode>,
        }}
      />
    ),
  },

  format: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.formatTitle', {
      defaultMessage: 'Set format',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.formatDescription', {
      defaultMessage: `Set your preferred format for displaying the value. Changing the format can affect the value and prevent highlighting in Discover.`,
    }),
  },

  popularity: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.popularityTitle', {
      defaultMessage: 'Set popularity',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.popularityDescription', {
      defaultMessage: `Adjust the popularity to make the field appear higher or lower in the fields list.  By default, Discover orders fields from most selected to least selected.`,
    }),
  },
});

export const FieldDetail = ({}) => {
  const { links, fieldTypeToProcess } = useFieldEditorContext();
  const i18nTexts = geti18nTexts();
  return (
    <>
      {/* Set custom label */}
      <FormRow
        title={i18nTexts.customLabel.title}
        description={i18nTexts.customLabel.description}
        formFieldPath="__meta__.isCustomLabelVisible"
        data-test-subj="customLabelRow"
        withDividerRule
      >
        <CustomLabelField />
      </FormRow>

      {/* Set custom description */}
      <FormRow
        title={i18nTexts.customDescription.title}
        description={i18nTexts.customDescription.description}
        formFieldPath="__meta__.isCustomDescriptionVisible"
        data-test-subj="customDescriptionRow"
        withDividerRule
      >
        <CustomDescriptionField />
      </FormRow>

      {/* Set value */}
      {fieldTypeToProcess === 'runtime' && (
        <FormRow
          title={i18nTexts.value.title}
          description={i18nTexts.value.description}
          formFieldPath="__meta__.isValueVisible"
          data-test-subj="valueRow"
          withDividerRule
        >
          <ScriptField links={links} />
        </FormRow>
      )}

      {/* Set custom format */}
      <FormRow
        title={i18nTexts.format.title}
        description={i18nTexts.format.description}
        formFieldPath="__meta__.isFormatVisible"
        data-test-subj="formatRow"
        withDividerRule
      >
        <FormatField />
      </FormRow>

      {/* Advanced settings */}
      <AdvancedParametersSection>
        {/* Popularity score (higher value means it will be positioned higher in the fields list) */}
        <FormRow
          title={i18nTexts.popularity.title}
          description={i18nTexts.popularity.description}
          formFieldPath="__meta__.isPopularityVisible"
          data-test-subj="popularityRow"
          withDividerRule
        >
          <PopularityField />
        </FormRow>
      </AdvancedParametersSection>
    </>
  );
};

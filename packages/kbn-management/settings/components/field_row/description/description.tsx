/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';

import { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
import { EuiText } from '@elastic/eui';

import { useFieldStyles } from '../field_row.styles';
import { FieldDeprecation } from './deprecation';
import { FieldDefaultValue } from './default_value';

export const DATA_TEST_SUBJ_DESCRIPTION = 'settings-description';

type Field<T extends SettingType> = Pick<
  FieldDefinition<T>,
  | 'defaultValue'
  | 'defaultValueDisplay'
  | 'description'
  | 'id'
  | 'isDefaultValue'
  | 'name'
  | 'savedValue'
  | 'type'
>;

/**
 * Props for a {@link FieldDescription} component.
 */
export interface FieldDescriptionProps<T extends SettingType> {
  field: Field<T>;
  unsavedChange?: UnsavedFieldChange<T>;
}

/**
 * Component for displaying the description of a {@link FieldDefinition}.
 */
export const FieldDescription = <T extends SettingType>({
  field,
  unsavedChange,
}: FieldDescriptionProps<T>) => {
  const { cssDescription } = useFieldStyles({ field, unsavedChange });
  const { description, name } = field;

  // TODO - this does *not* match the `UiSetting` type.
  // @see packages/core/ui-settings/core-ui-settings-common/src/ui_settings.ts
  let content: ReactElement | string | undefined = description;

  if (!React.isValidElement(content)) {
    content = (
      <div
        /*
         * Justification for dangerouslySetInnerHTML:
         * Setting description may contain formatting and links to documentation.
         */
        /* @ts-expect-error upgrade typescript v5.1.6 */
        dangerouslySetInnerHTML={{ __html: content || '' }} // eslint-disable-line react/no-danger
      />
    );
  }

  if (content) {
    content = (
      <EuiText size="s" data-test-subj={`${DATA_TEST_SUBJ_DESCRIPTION}-${name}`}>
        {content}
      </EuiText>
    );
  }

  return (
    <div css={cssDescription}>
      <FieldDeprecation {...{ field }} />
      {content}
      <FieldDefaultValue {...{ field, unsavedChange }} />
    </div>
  );
};

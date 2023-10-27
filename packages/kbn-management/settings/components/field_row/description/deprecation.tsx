/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FieldDefinition, SettingType } from '@kbn/management-settings-types';
import { useServices } from '../services';

export const DATA_TEST_SUBJ_DEPRECATION_PREFIX = 'description-block-deprecation';

type Field<T extends SettingType> = Pick<FieldDefinition<T>, 'id' | 'deprecation' | 'name'>;

/**
 * Props for a {@link FieldDeprecation} component.
 */
export interface FieldDeprecationProps<T extends SettingType> {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Field<T>;
}

/**
 *
 */
export const FieldDeprecation = <T extends SettingType>({ field }: FieldDeprecationProps<T>) => {
  const { links } = useServices();
  const { deprecation, name, id } = field;

  if (!deprecation) {
    return null;
  }

  return (
    <div data-test-subj={`${DATA_TEST_SUBJ_DEPRECATION_PREFIX}-${id}`}>
      <EuiToolTip content={deprecation.message}>
        <EuiBadge
          color="warning"
          onClick={() => {
            window.open(links[deprecation!.docLinksKey], '_blank');
          }}
          onClickAriaLabel={i18n.translate('management.settings.field.deprecationClickAreaLabel', {
            defaultMessage: 'Click to view deprecation documentation for {name}.',
            values: {
              name,
            },
          })}
        >
          Deprecated
        </EuiBadge>
      </EuiToolTip>
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isBoolean, isNumber, isObject } from 'lodash';
import React from 'react';
import { euiStyled } from '@kbn/react-kibana-context-styled';
import { i18n } from '@kbn/i18n';

const EmptyValue = euiStyled.span`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
  text-align: left;
`;

export function FormattedKey({ k, value }: { k: string; value: unknown }): JSX.Element {
  if (value == null) {
    return <EmptyValue>{k}</EmptyValue>;
  }

  return <React.Fragment>{k}</React.Fragment>;
}

export function FormattedValue({ value }: { value: any }): JSX.Element {
  if (isObject(value)) {
    return <pre>{JSON.stringify(value, null, 4)}</pre>;
  } else if (isBoolean(value) || isNumber(value)) {
    return <React.Fragment>{String(value)}</React.Fragment>;
  } else if (!value) {
    return (
      <EmptyValue>
        {i18n.translate('keyValueMetadataTable.notAvailableLabel', {
          defaultMessage: 'N/A',
        })}
      </EmptyValue>
    );
  }

  return <React.Fragment>{value}</React.Fragment>;
}

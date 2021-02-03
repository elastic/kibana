/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { EuiDescribedFormGroup, EuiTitle } from '@elastic/eui';
import { FieldHook } from '../hook_form_lib';
import { Field } from './field';

interface Props {
  title: string | JSX.Element;
  description?: string | JSX.Element;
  field?: FieldHook;
  euiFieldProps?: Record<string, any>;
  titleTag?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children?: React.ReactNode;
  [key: string]: any;
}

function isTitleString(title: any): title is string {
  return typeof title === 'string' || title.type.name === 'FormattedMessage';
}

export const FormRow = ({
  title,
  idAria,
  description,
  field,
  children,
  titleTag = 'h4',
  ...rest
}: Props) => {
  let titleWrapped;

  // If a string is provided, create a default Euititle of size "m"
  if (isTitleString(title)) {
    // Create the correct title tag
    const titleWithHTag = React.createElement(titleTag, undefined, title);
    titleWrapped = <EuiTitle size="s">{titleWithHTag}</EuiTitle>;
  } else {
    titleWrapped = title;
  }

  return (
    <EuiDescribedFormGroup title={titleWrapped} description={description} fullWidth>
      {children ? children : field ? <Field field={field!} {...rest} /> : null}
    </EuiDescribedFormGroup>
  );
};

/**
 * Get a <FormRow /> component providing some common props for all instances.
 * @param partialProps Partial props to apply to all <FormRow /> instances
 */
export const getFormRow = (partialProps: Partial<Props>) => (props: Partial<Props>) => {
  const componentProps = { ...partialProps, ...props } as Props;
  return <FormRow {...componentProps} />;
};

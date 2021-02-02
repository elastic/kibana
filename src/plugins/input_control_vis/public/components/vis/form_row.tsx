/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { ReactElement } from 'react';

import { EuiFormRow, EuiToolTip, EuiIcon } from '@elastic/eui';

export interface FormRowProps {
  label: string;
  warningMsg?: string;
  id: string;
  children: ReactElement;
  controlIndex: number;
  disableMsg?: string;
}

export function FormRow(props: FormRowProps) {
  let control = props.children;
  if (props.disableMsg) {
    control = (
      <EuiToolTip position="top" content={props.disableMsg} anchorClassName="eui-displayBlock">
        {control}
      </EuiToolTip>
    );
  }

  const label = props.warningMsg ? (
    <>
      <EuiToolTip position="top" content={props.warningMsg}>
        <EuiIcon type="alert" />
      </EuiToolTip>
      {props.label}
    </>
  ) : (
    props.label
  );

  return (
    <EuiFormRow label={label} id={props.id} data-test-subj={'inputControl' + props.controlIndex}>
      {control}
    </EuiFormRow>
  );
}

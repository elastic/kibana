/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import useMount from 'react-use/lib/useMount';
import classNames from 'classnames';
import { EuiFormControlLayout, EuiFormLabel, EuiFormRow } from '@elastic/eui';

import { InputControlEmbeddable } from '../embeddable/types';

import './control_frame.scss';

interface ControlFrameProps {
  embeddable: InputControlEmbeddable;
  twoLine?: boolean;
}

export const ControlFrame = ({ twoLine, embeddable }: ControlFrameProps) => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  useMount(() => {
    if (embeddableRoot.current && embeddable) embeddable.render(embeddableRoot.current);
  });

  const form = (
    <EuiFormControlLayout
      className="controlFrame--formControlLayout"
      fullWidth
      prepend={
        twoLine ? undefined : (
          <EuiFormLabel htmlFor={embeddable.id}>{embeddable.getInput().title}</EuiFormLabel>
        )
      }
    >
      <div
        className={classNames('controlFrame--control', {
          'optionsList--filterBtnTwoLine': twoLine,
          'optionsList--filterBtnSingle': !twoLine,
        })}
        id={embeddable.id}
        ref={embeddableRoot}
      />
    </EuiFormControlLayout>
  );

  return twoLine ? (
    <EuiFormRow fullWidth label={embeddable.getInput().title}>
      {form}
    </EuiFormRow>
  ) : (
    form
  );
};

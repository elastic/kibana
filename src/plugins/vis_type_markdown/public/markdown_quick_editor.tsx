/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiTextArea } from '@elastic/eui';
import { Vis, SerializedVis } from '../../visualizations/public';

interface Props {
  onChange: (vis: SerializedVis) => void;
  vis: SerializedVis;
}

const Editor = (props: Props) => {
  const { vis, onChange } = props;
  const [text, setText] = useState(vis.params.markdown);

  return (
    <EuiTextArea
      onChange={(e) => {
        const newText = e.currentTarget.value;
        setText(newText);

        const newVis = {
          ...vis,
          params: {
            ...vis.params,
            markdown: newText,
          },
        };

        onChange(newVis);
      }}
    >
      {text}
    </EuiTextArea>
  );
};

export const getQuickEditor = () => {
  return Promise.resolve({
    component: Editor,
    onSave: () => {
      console.log('Testing');
    },
  });
};

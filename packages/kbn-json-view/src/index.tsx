/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
// import { css } from '@emotion/react';
// import { useEuiTheme } from '@elastic/eui';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { Tree } from './Tree';

const TreeMemoized = React.memo(Tree);

export const JSONViewer = ({ data }: { data: EsHitRecord }) => {
  // const { euiTheme } = useEuiTheme();
  // const iconCSS = css`
  //   margin-right: ${euiTheme.size.m};
  // `;

  return (
    <>
      <TreeMemoized data={data} />
    </>
  );
};

// const styles = StyleSheet.create({
//   prismView: {
//     padding: '1em',
//     fontFamily: 'monospace',
//   },
//   message: {
//     padding: '1em',
//     borderRadius: '0.5em',
//     marginTop: '1em',
//   },
//   error: {
//     backgroundColor: '#E69595',
//     border: '1px solid #964B4B',
//     color: '#964B4B',
//   },
//   info: {
//     backgroundColor: '#A3D0F3',
//     border: '1px solid #386282',
//     color: '#386282',
//   },
//   contentArea: {
//     margin: '2em',
//   },
//   contentLoader: {
//     width: '450px',
//   },
// });

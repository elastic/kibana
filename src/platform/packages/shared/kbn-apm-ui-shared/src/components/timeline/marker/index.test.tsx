/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the "Elastic License
//  * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
//  * Public License v 1"; you may not use this file except in compliance with, at
//  * your election, the "Elastic License 2.0", the "GNU Affero General Public
//  * License v3.0 only", or the "Server Side Public License, v 1".
//  */

// import React from 'react';
// import { Marker } from '.';
// import type { AgentMark, ErrorMark } from '../../../types/mark';
// import { renderWithTheme } from '../../../../../utils/test_helpers';

// jest.mock('../../../../../hooks/use_apm_params', () => ({
//   useAnyOfApmParams: jest.fn(() => ({
//     query: {
//       serviceGroup: 'test',
//     },
//   })),
// }));

// describe('Marker', () => {
//   it('renders agent marker correctly', () => {
//     const mark: AgentMark = {
//       id: 'agent',
//       offset: 1000,
//       type: 'agentMark',
//       verticalLine: true,
//     };

//     const { container } = renderWithTheme(<Marker mark={mark} x={10} />);

//     expect(container).toMatchSnapshot();
//   });

//   it('renders error marker correctly', () => {
//     const mark: ErrorMark = {
//       id: 'agent',
//       offset: 1000,
//       type: 'errorMark',
//       verticalLine: true,
//       error: {
//         id: '123',
//         trace: { id: '123' },
//         transaction: { id: '456' },
//         error: { grouping_key: '123', id: '123test' },
//         service: { name: 'bar' },
//         timestamp: { us: 1000000 },
//       },
//       serviceColor: '#fff',
//     };

//     const { container } = renderWithTheme(<Marker mark={mark} x={10} />);

//     expect(container).toMatchSnapshot();
//   });
// });

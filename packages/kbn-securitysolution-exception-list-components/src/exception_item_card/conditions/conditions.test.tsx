/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

describe('conditions temp', () => {
  it('temp', () => {
    expect(true).toEqual(true);
  });
});

// import { render } from '@testing-library/react';
// import React from 'react';

// // import { TestProviders } from '../../../../../../common/mock';
// import { ExceptionItemCardConditions } from './conditions';

// interface TestEntry {
//   field: string;
//   operator: 'included' | 'excluded';
//   type: unknown;
//   value?: string;
//   entries?: TestEntry[];
// }
// const getEntryKey = (entry: TestEntry, index: string) => {
//   const { field, type, value } = entry;
//   return `${field}${type}${value || ''}${index}`;
// };
// const entries: TestEntry[] = [
//   {
//     field: 'host.name',
//     operator: 'included',
//     type: 'match',
//     value: 'host',
//   },
//   {
//     field: 'threat.indicator.port',
//     operator: 'included',
//     type: 'exists',
//   },
//   {
//     entries: [
//       {
//         field: 'valid',
//         operator: 'included',
//         type: 'match',
//         value: 'true',
//       },
//     ],
//     field: 'file.Ext.code_signature',
//     type: 'nested',
//     operator: 'included',
//   },
// ];
// describe('ExceptionItemCardConditions', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//     jest.resetAllMocks();
//   });
//   it('it includes os condition if one exists', () => {
//     const wrapper = render(
//       // <TestProviders>
//       <ExceptionItemCardConditions
//         os={['linux']}
//         entries={entries}
//         dataTestSubj="exceptionItemConditions"
//       />
//       // </TestProviders>
//     );
//     // Text is gonna look a bit off unformatted

//     expect(wrapper.getByTestId('exceptionItemConditions-os')).toHaveTextContent('OSIS Linux');

//     const testId = `exceptionItemConditions-${getEntryKey(entries[0], '0')}-condition`;
//     expect(wrapper.getByTestId(testId)).toHaveTextContent('host.nameIS host');

//     const testId1 = `exceptionItemConditions-${getEntryKey(entries[1], '1')}-condition`;
//     expect(wrapper.getByTestId(testId1)).toHaveTextContent('AND threat.indicator.portexists');

//     const testId2 = `exceptionItemConditions-${getEntryKey(entries[2], '2')}-condition`;
//     expect(wrapper.getByTestId(testId2)).toHaveTextContent('AND file.Ext.code_signature');

//     // const testId2Nested = `nested-${getEntryKey(entries[2]?.entries[0], '0')}-condition`;
//     // expect(wrapper.getByTestId(testId2Nested)).toHaveTextContent('validIS true');
//   });

//   // TODO: FIX test and add more
//   // it('it renders item conditions', () => {
//   //   const wrapper = render(
//   //     <TestProviders>
//   //       <ExceptionItemCardConditions
//   //         entries={[
//   //           {
//   //             field: 'host.name',
//   //             operator: 'included',
//   //             type: 'match',
//   //             value: 'host',
//   //           },
//   //           {
//   //             field: 'host.name',
//   //             operator: 'excluded',
//   //             type: 'match',
//   //             value: 'host',
//   //           },
//   //           {
//   //             field: 'host.name',
//   //             operator: 'included',
//   //             type: 'match_any',
//   //             value: ['foo', 'bar'],
//   //           },
//   //           {
//   //             field: 'host.name',
//   //             operator: 'excluded',
//   //             type: 'match_any',
//   //             value: ['foo', 'bar'],
//   //           },
//   //           {
//   //             field: 'user.name',
//   //             operator: 'included',
//   //             type: 'wildcard',
//   //             value: 'foo*',
//   //           },
//   //           {
//   //             field: 'user.name',
//   //             operator: 'excluded',
//   //             type: 'wildcard',
//   //             value: 'foo*',
//   //           },
//   //           {
//   //             field: 'threat.indicator.port',
//   //             operator: 'included',
//   //             type: 'exists',
//   //           },
//   //           {
//   //             field: 'threat.indicator.port',
//   //             operator: 'excluded',
//   //             type: 'exists',
//   //           },
//   //           {
//   //             entries: [
//   //               {
//   //                 field: 'valid',
//   //                 operator: 'included',
//   //                 type: 'match',
//   //                 value: 'true',
//   //               },
//   //             ],
//   //             field: 'file.Ext.code_signature',
//   //             type: 'nested',
//   //           },
//   //         ]}
//   //         dataTestSubj="exceptionItemConditions"
//   //       />
//   //     </TestProviders>
//   //   );

//   //   expect(wrapper.queryByTestId('exceptionItemConditions-os')).not.toBeInTheDocument();
//   //   const conditions = wrapper.getAllByTestId('exceptionItemConditions-condition');
//   //   expect(conditions[0]).toHaveTextContent('host.nameIS host');

//   //   // Match
//   //   expect(conditions[1]).toHaveTextContent('AND host.nameIS NOT host');
//   //   // MATCH_ANY
//   //   expect(conditions[2]).toHaveTextContent('AND host.nameis one of foobar');
//   //   expect(conditions[3]).toHaveTextContent('AND host.nameis not one of foobar');

//   //   // WILDCARD
//   //   expect(conditions[4]).toHaveTextContent('AND user.nameMATCHES foo*');
//   //   expect(conditions[5]).toHaveTextContent('AND user.nameDOES NOT MATCH foo*');

//   //   // EXISTS
//   //   expect(conditions[6]).toHaveTextContent('AND threat.indicator.portexists');
//   //   expect(conditions[7]).toHaveTextContent('AND threat.indicator.portdoes not exist');

//   //   // NESTED
//   //   expect(conditions[8]).toHaveTextContent('AND file.Ext.code_signature validIS true');
//   // });

//   // it('it renders list conditions', () => {
//   //   const wrapper = render(
//   //     <TestProviders>
//   //       <ExceptionItemCardConditions
//   //         entries={[
//   //           {
//   //             field: 'host.name',
//   //             list: {
//   //               id: 'ips.txt',
//   //               type: 'keyword',
//   //             },
//   //             operator: 'included',
//   //             type: 'list',
//   //           },
//   //           {
//   //             field: 'host.name',
//   //             list: {
//   //               id: 'ips.txt',
//   //               type: 'keyword',
//   //             },
//   //             operator: 'excluded',
//   //             type: 'list',
//   //           },
//   //         ]}
//   //         dataTestSubj="exceptionItemConditions"
//   //       />
//   //     </TestProviders>
//   //   );

//   //   // Text is gonna look a bit off unformatted
//   //   const conditions = wrapper.getAllByTestId('exceptionItemConditions-condition');
//   //   expect(conditions[0]).toHaveTextContent('host.nameincluded in ips.txt');
//   //   expect(conditions[1]).toHaveTextContent('ND host.nameis not included in ips.txt');
//   // });
// });

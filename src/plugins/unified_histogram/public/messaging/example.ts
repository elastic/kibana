/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { Observable } from 'rxjs';
// import { useMessage, useMessageData } from './hooks';
// import { messageIsType } from './utils';

// enum TestType {
//   Refetch = 'refetch',
//   End = 'end',
// }

// type TestMessage = { type: TestType.Refetch } | { type: TestType.End; payload: { time: number } };

// const observable = new Observable<TestMessage>();
// const message = { type: TestType.End, payload: { time: Date.now() } } as TestMessage;

// if (messageIsType(message, TestType.Refetch)) {
//   message.payload.time = Date.now();
// }

// if (messageIsType(message, TestType.End)) {
//   message.payload.time = Date.now();
// }

// if (messageIsType(message, 'blah')) {
//   message.payload.time = Date.now();
// }

// // eslint-disable-next-line react-hooks/rules-of-hooks
// useMessage(observable, TestType.Refetch, (payload) => {
//   payload.time = Date.now();
// });

// // eslint-disable-next-line react-hooks/rules-of-hooks
// useMessage(observable, TestType.End, (payload) => {
//   payload.time = Date.now();
// });

// // eslint-disable-next-line react-hooks/rules-of-hooks
// useMessage(observable, 'blah', (payload) => {});

// // eslint-disable-next-line react-hooks/rules-of-hooks
// const refetch = useMessageData(observable, TestType.Refetch);

// // eslint-disable-next-line react-hooks/rules-of-hooks
// const end = useMessageData(observable, TestType.End);

// // eslint-disable-next-line react-hooks/rules-of-hooks
// const blah = useMessageData(observable, 'blah');

export {};

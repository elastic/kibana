/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {
  useBatchedPublishingSubjects,
  useBatchedOptionalPublishingSubjects,
} from './publishing_batcher';
import { useStateFromPublishingSubject } from './publishing_subject';
import { PublishingSubject } from './types';

describe('publishing subject', () => {
  describe('render', () => {
    let subject1: BehaviorSubject<number>;
    let subject2: BehaviorSubject<number>;
    let subject3: BehaviorSubject<number>;
    let subject4: BehaviorSubject<number>;
    let subject5: BehaviorSubject<number>;
    let subject6: BehaviorSubject<number>;
    beforeEach(() => {
      subject1 = new BehaviorSubject<number>(0);
      subject2 = new BehaviorSubject<number>(0);
      subject3 = new BehaviorSubject<number>(0);
      subject4 = new BehaviorSubject<number>(0);
      subject5 = new BehaviorSubject<number>(0);
      subject6 = new BehaviorSubject<number>(0);
    });

    function incrementAll() {
      subject1.next(subject1.getValue() + 1);
      subject2.next(subject2.getValue() + 1);
      subject3.next(subject3.getValue() + 1);
      subject4.next(subject4.getValue() + 1);
      subject5.next(subject5.getValue() + 1);
      subject6.next(subject6.getValue() + 1);
    }

    test('should render once when all state changes are in click handler (react batch)', async () => {
      let renderCount = 0;
      function Component() {
        const value1 = useStateFromPublishingSubject(subject1);
        const value2 = useStateFromPublishingSubject(subject2);
        const value3 = useStateFromPublishingSubject(subject3);
        const value4 = useStateFromPublishingSubject(subject4);
        const value5 = useStateFromPublishingSubject(subject5);
        const value6 = useStateFromPublishingSubject(subject6);

        renderCount++;
        return (
          <>
            <button onClick={incrementAll} />
            <span>{`value1: ${value1}, value2: ${value2}, value3: ${value3}, value4: ${value4}, value5: ${value5}, value6: ${value6}`}</span>
          </>
        );
      }
      render(<Component />);
      await waitFor(() => {
        expect(
          screen.getByText('value1: 0, value2: 0, value3: 0, value4: 0, value5: 0, value6: 0')
        ).toBeInTheDocument();
      });
      userEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(
          screen.getByText('value1: 1, value2: 1, value3: 1, value4: 1, value5: 1, value6: 1')
        ).toBeInTheDocument();
      });
      expect(renderCount).toBe(2);
    });

    test('should batch state updates when using useBatchedPublishingSubjects', async () => {
      let renderCount = 0;
      function Component() {
        const [value1, value2, value3, value4, value5, value6] = useBatchedPublishingSubjects(
          subject1,
          subject2,
          subject3,
          subject4,
          subject5,
          subject6
        );

        renderCount++;
        return (
          <>
            <button
              onClick={() => {
                // using setTimeout to move next calls outside of callstack from onClick
                setTimeout(incrementAll, 0);
              }}
            />
            <span>{`value1: ${value1}, value2: ${value2}, value3: ${value3}, value4: ${value4}, value5: ${value5}, value6: ${value6}`}</span>
          </>
        );
      }
      render(<Component />);
      await waitFor(() => {
        expect(
          screen.getByText('value1: 0, value2: 0, value3: 0, value4: 0, value5: 0, value6: 0')
        ).toBeInTheDocument();
      });
      userEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(
          screen.getByText('value1: 1, value2: 1, value3: 1, value4: 1, value5: 1, value6: 1')
        ).toBeInTheDocument();
      });
      expect(renderCount).toBe(2);
    });

    test('should batch state updates when using useBatchedOptionalPublishingSubjects', async () => {
      let renderCount = 0;
      function Component() {
        const [value1, value2, value3, value4, value5, value6] =
          useBatchedOptionalPublishingSubjects(
            subject1,
            subject2,
            subject3,
            subject4,
            subject5,
            subject6
          );

        renderCount++;
        return (
          <>
            <button
              onClick={() => {
                // using setTimeout to move next calls outside of callstack from onClick
                setTimeout(incrementAll, 0);
              }}
            />
            <span>{`value1: ${value1}, value2: ${value2}, value3: ${value3}, value4: ${value4}, value5: ${value5}, value6: ${value6}`}</span>
          </>
        );
      }
      render(<Component />);
      await waitFor(() => {
        expect(
          screen.getByText('value1: 0, value2: 0, value3: 0, value4: 0, value5: 0, value6: 0')
        ).toBeInTheDocument();
      });
      userEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(
          screen.getByText('value1: 1, value2: 1, value3: 1, value4: 1, value5: 1, value6: 1')
        ).toBeInTheDocument();
      });
      expect(renderCount).toBe(2);
    });

    test('should render for each state update outside of click handler', async () => {
      let renderCount = 0;
      function Component() {
        const value1 = useStateFromPublishingSubject(subject1);
        const value2 = useStateFromPublishingSubject(subject2);
        const value3 = useStateFromPublishingSubject(subject3);
        const value4 = useStateFromPublishingSubject(subject4);
        const value5 = useStateFromPublishingSubject(subject5);
        const value6 = useStateFromPublishingSubject(subject6);

        renderCount++;
        return (
          <>
            <button
              onClick={() => {
                // using setTimeout to move next calls outside of callstack from onClick
                setTimeout(incrementAll, 0);
              }}
            />
            <span>{`value1: ${value1}, value2: ${value2}, value3: ${value3}, value4: ${value4}, value5: ${value5}, value6: ${value6}`}</span>
          </>
        );
      }
      render(<Component />);
      await waitFor(() => {
        expect(
          screen.getByText('value1: 0, value2: 0, value3: 0, value4: 0, value5: 0, value6: 0')
        ).toBeInTheDocument();
      });
      userEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(
          screen.getByText('value1: 1, value2: 1, value3: 1, value4: 1, value5: 1, value6: 1')
        ).toBeInTheDocument();
      });
      expect(renderCount).toBe(7);
    });
  });

  describe('Publishing subject is undefined on first render', () => {
    test('useBatchedOptionalPublishingSubjects should update state when publishing subject is provided', async () => {
      let renderCount = 0;
      function Component() {
        // When subjects is expected to change, subjects must be part of react state.
        const [subjectFoo, setSubjectFoo] = useState<BehaviorSubject<string> | undefined>(
          undefined
        );
        const [valueFoo] = useBatchedOptionalPublishingSubjects(subjectFoo);

        renderCount++;
        return (
          <>
            <button
              onClick={() => {
                if (!subjectFoo) {
                  setSubjectFoo(new BehaviorSubject<string>('foo1'));
                } else {
                  subjectFoo.next('foo2');
                }
              }}
            />
            <span>{`valueFoo: ${valueFoo}`}</span>
          </>
        );
      }
      render(<Component />);
      await waitFor(() => {
        expect(screen.getByText('valueFoo: undefined')).toBeInTheDocument();
      });
      userEvent.click(screen.getByRole('button'));
      userEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('valueFoo: foo2')).toBeInTheDocument();
      });
      expect(renderCount).toBe(4);
    });

    test('useStateFromPublishingSubject should update state when publishing subject is provided', async () => {
      let renderCount = 0;
      function Component() {
        // When subject is expected to change, subject must be part of react state.
        const [subjectFoo, setSubjectFoo] = useState<PublishingSubject<string> | undefined>(
          undefined
        );
        const valueFoo = useStateFromPublishingSubject(subjectFoo);

        renderCount++;
        return (
          <>
            <button
              onClick={() => {
                // using setTimeout to move next calls outside of callstack from onClick
                setTimeout(() => {
                  setSubjectFoo(new BehaviorSubject<string>('foo'));
                }, 0);
              }}
            />
            <span>{`valueFoo: ${valueFoo}`}</span>
          </>
        );
      }
      render(<Component />);
      await waitFor(() => {
        expect(screen.getByText('valueFoo: undefined')).toBeInTheDocument();
      });
      userEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('valueFoo: foo')).toBeInTheDocument();
      });
      expect(renderCount).toBe(3);
    });
  });
});

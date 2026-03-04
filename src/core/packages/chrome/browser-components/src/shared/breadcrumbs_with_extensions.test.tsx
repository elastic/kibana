/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { ChromeBreadcrumbsAppendExtension } from '@kbn/core-chrome-browser';
import { BreadcrumbsWithExtensionsWrapper } from './breadcrumbs_with_extensions';

describe('BreadcrumbsWithExtensionsWrapper', () => {
  it('renders children without extensions when the observable emits empty array', () => {
    const extensions$ = new BehaviorSubject<ChromeBreadcrumbsAppendExtension[]>([]);
    render(
      <BreadcrumbsWithExtensionsWrapper breadcrumbsAppendExtensions$={extensions$}>
        <span data-test-subj="breadcrumb-child">Home</span>
      </BreadcrumbsWithExtensionsWrapper>
    );
    expect(screen.getByTestId('breadcrumb-child')).toBeInTheDocument();
  });

  it('renders a ReactNode-based extension alongside children', () => {
    const extensions$ = new BehaviorSubject<ChromeBreadcrumbsAppendExtension[]>([
      { content: <span data-test-subj="react-extension">Badge</span> },
    ]);
    render(
      <BreadcrumbsWithExtensionsWrapper breadcrumbsAppendExtensions$={extensions$}>
        <span data-test-subj="breadcrumb-child">Home</span>
      </BreadcrumbsWithExtensionsWrapper>
    );
    expect(screen.getByTestId('breadcrumb-child')).toBeInTheDocument();
    expect(screen.getByTestId('react-extension')).toBeInTheDocument();
  });

  it('renders a MountPoint-based extension alongside children', () => {
    const mount = (el: HTMLDivElement) => {
      el.setAttribute('data-test-subj', 'mount-extension');
      return () => {};
    };
    const extensions$ = new BehaviorSubject<ChromeBreadcrumbsAppendExtension[]>([
      { mount },
    ]);
    render(
      <BreadcrumbsWithExtensionsWrapper breadcrumbsAppendExtensions$={extensions$}>
        <span data-test-subj="breadcrumb-child">Home</span>
      </BreadcrumbsWithExtensionsWrapper>
    );
    expect(screen.getByTestId('breadcrumb-child')).toBeInTheDocument();
    expect(screen.getByTestId('mount-extension')).toBeInTheDocument();
  });

  it('renders updated extensions when the observable emits new values', () => {
    const extensions$ = new BehaviorSubject<ChromeBreadcrumbsAppendExtension[]>([]);
    render(
      <BreadcrumbsWithExtensionsWrapper breadcrumbsAppendExtensions$={extensions$}>
        <span>Home</span>
      </BreadcrumbsWithExtensionsWrapper>
    );
    expect(screen.queryByTestId('react-extension')).not.toBeInTheDocument();

    act(() => {
      extensions$.next([{ content: <span data-test-subj="react-extension">Badge</span> }]);
    });

    expect(screen.getByTestId('react-extension')).toBeInTheDocument();
  });
});

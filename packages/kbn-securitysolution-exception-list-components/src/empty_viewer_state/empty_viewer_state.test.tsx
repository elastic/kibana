/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { EmptyViewerState } from './empty_viewer_state';
import { ListTypeText, ViewerStatus } from '../types';

describe('EmptyViewerState', () => {
  it('it renders error screen when "viewerStatus" is "error" with the default title and body', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.ERROR}
        onCreateExceptionListItem={jest.fn()}
      />
    );

    expect(wrapper.getByTestId('errorViewerState')).toBeTruthy();
    expect(wrapper.getByTestId('errorTitle')).toHaveTextContent('Unable to load exception items');
    expect(wrapper.getByTestId('errorBody')).toHaveTextContent(
      'There was an error loading the exception items. Contact your administrator for help.'
    );
  });
  it('it renders error screen when "viewerStatus" is "error" when sending the title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.ERROR}
        onCreateExceptionListItem={jest.fn()}
        title="Error title"
        body="Error body"
      />
    );

    expect(wrapper.getByTestId('errorViewerState')).toBeTruthy();
    expect(wrapper.getByTestId('errorTitle')).toHaveTextContent('Error title');
    expect(wrapper.getByTestId('errorBody')).toHaveTextContent('Error body');
  });
  it('it renders loading screen when "viewerStatus" is "loading"', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.LOADING}
        onCreateExceptionListItem={jest.fn()}
      />
    );

    expect(wrapper.getByTestId('loadingViewerState')).toBeTruthy();
  });
  it('it renders empty search screen when "viewerStatus" is "empty_search" with the default title and body', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY_SEARCH}
        onCreateExceptionListItem={jest.fn()}
      />
    );

    expect(wrapper.getByTestId('emptySearchViewerState')).toBeTruthy();
    expect(wrapper.getByTestId('emptySearchTitle')).toHaveTextContent(
      'No results match your search criteria'
    );
    expect(wrapper.getByTestId('emptySearchBody')).toHaveTextContent('Try modifying your search');
  });
  it('it renders empty search screen when "viewerStatus" is "empty_search" when sending title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY_SEARCH}
        onCreateExceptionListItem={jest.fn()}
        title="Empty search title"
        body="Empty search body"
      />
    );

    expect(wrapper.getByTestId('emptySearchViewerState')).toBeTruthy();
    expect(wrapper.getByTestId('emptySearchTitle')).toHaveTextContent('Empty search title');
    expect(wrapper.getByTestId('emptySearchBody')).toHaveTextContent('Empty search body');
  });
  it('it renders no items screen when "viewerStatus" is "empty" when sending title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY}
        onCreateExceptionListItem={jest.fn()}
        body="There are no endpoint exceptions."
        buttonText="Add endpoint exception"
      />
    );

    const { getByTestId } = wrapper;
    expect(getByTestId('emptyBody')).toHaveTextContent('There are no endpoint exceptions.');
    expect(getByTestId('emptyStateButton')).toHaveTextContent('Add endpoint exception');
    expect(getByTestId('emptyViewerState')).toBeTruthy();
  });
  it('it renders no items screen when "viewerStatus" is "empty" with default title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY}
        onCreateExceptionListItem={jest.fn()}
      />
    );

    const { getByTestId } = wrapper;
    expect(getByTestId('emptyViewerState')).toBeTruthy();
    expect(getByTestId('emptyTitle')).toHaveTextContent('Add exceptions to this rule');
    expect(getByTestId('emptyBody')).toHaveTextContent(
      'There is no exception in your rule. Create your first rule exception.'
    );
    expect(getByTestId('emptyStateButton')).toHaveTextContent('Create rule exception');
  });
  it('it renders no items screen when "viewerStatus" is "empty" with default title and body props and listType endPoint', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY}
        onCreateExceptionListItem={jest.fn()}
        listType={ListTypeText.ENDPOINT}
      />
    );

    const { getByTestId } = wrapper;
    expect(getByTestId('emptyViewerState')).toBeTruthy();
    expect(getByTestId('emptyTitle')).toHaveTextContent('Add exceptions to this rule');
    expect(getByTestId('emptyBody')).toHaveTextContent(
      'There is no exception in your rule. Create your first rule exception.'
    );
    expect(getByTestId('emptyStateButton')).toHaveTextContent('Create endpoint exception');
  });
});

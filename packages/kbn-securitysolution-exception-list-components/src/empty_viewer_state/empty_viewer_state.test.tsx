/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';

import { EmptyViewerState } from '.';
import { ListTypeText, ViewerStatus } from '../types';
import * as i18n from '../translations';

describe('EmptyViewerState', () => {
  it('it should render "error" with the default title and body', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.ERROR}
        onEmptyButtonStateClick={jest.fn()}
      />
    );

    expect(wrapper.getByTestId('errorViewerState')).toBeTruthy();
    expect(wrapper.getByTestId('errorTitle')).toHaveTextContent(
      i18n.EMPTY_VIEWER_STATE_ERROR_TITLE
    );
    expect(wrapper.getByTestId('errorBody')).toHaveTextContent(i18n.EMPTY_VIEWER_STATE_ERROR_BODY);
  });
  it('it should render "error" when sending the title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.ERROR}
        onEmptyButtonStateClick={jest.fn()}
        title="Error title"
        body="Error body"
      />
    );

    expect(wrapper.getByTestId('errorViewerState')).toBeTruthy();
    expect(wrapper.getByTestId('errorTitle')).toHaveTextContent('Error title');
    expect(wrapper.getByTestId('errorBody')).toHaveTextContent('Error body');
  });
  it('it should render loading', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.LOADING}
        onEmptyButtonStateClick={jest.fn()}
      />
    );

    expect(wrapper.getByTestId('loadingViewerState')).toBeTruthy();
  });
  it('it should render empty search with the default title and body', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY_SEARCH}
        onEmptyButtonStateClick={jest.fn()}
      />
    );

    expect(wrapper.getByTestId('emptySearchViewerState')).toBeTruthy();
    expect(wrapper.getByTestId('emptySearchTitle')).toHaveTextContent(
      i18n.EMPTY_VIEWER_STATE_EMPTY_SEARCH_TITLE
    );
    expect(wrapper.getByTestId('emptySearchBody')).toHaveTextContent(
      i18n.EMPTY_VIEWER_STATE_EMPTY_SEARCH_BODY
    );
  });
  it('it should render empty search when sending title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY_SEARCH}
        onEmptyButtonStateClick={jest.fn()}
        title="Empty search title"
        body="Empty search body"
      />
    );

    expect(wrapper.getByTestId('emptySearchViewerState')).toBeTruthy();
    expect(wrapper.getByTestId('emptySearchTitle')).toHaveTextContent('Empty search title');
    expect(wrapper.getByTestId('emptySearchBody')).toHaveTextContent('Empty search body');
  });
  it('it should render no items screen when sending title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY}
        onEmptyButtonStateClick={jest.fn()}
        body="There are no endpoint exceptions."
        buttonText="Add endpoint exception"
      />
    );

    const { getByTestId } = wrapper;
    expect(getByTestId('emptyBody')).toHaveTextContent('There are no endpoint exceptions.');
    expect(getByTestId('emptyStateButton')).toHaveTextContent('Add endpoint exception');
    expect(getByTestId('emptyViewerState')).toBeTruthy();
  });
  it('it should render no items with default title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY}
        onEmptyButtonStateClick={jest.fn()}
      />
    );

    const { getByTestId } = wrapper;
    expect(getByTestId('emptyViewerState')).toBeTruthy();
    expect(getByTestId('emptyTitle')).toHaveTextContent(i18n.EMPTY_VIEWER_STATE_EMPTY_TITLE);
    expect(getByTestId('emptyBody')).toHaveTextContent(i18n.EMPTY_VIEWER_STATE_EMPTY_BODY);
    expect(getByTestId('emptyStateButton')).toHaveTextContent(
      i18n.EMPTY_VIEWER_STATE_EMPTY_VIEWER_BUTTON('rule')
    );
  });
  it('it should render no items screen with default title and body props and listType endPoint', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY}
        onEmptyButtonStateClick={jest.fn()}
        listType={ListTypeText.ENDPOINT}
      />
    );

    const { getByTestId } = wrapper;
    expect(getByTestId('emptyViewerState')).toBeTruthy();
    expect(getByTestId('emptyTitle')).toHaveTextContent(i18n.EMPTY_VIEWER_STATE_EMPTY_TITLE);
    expect(getByTestId('emptyBody')).toHaveTextContent(i18n.EMPTY_VIEWER_STATE_EMPTY_BODY);
    expect(getByTestId('emptyStateButton')).toHaveTextContent(
      i18n.EMPTY_VIEWER_STATE_EMPTY_VIEWER_BUTTON(ListTypeText.ENDPOINT)
    );
  });
  it('it should render no items screen and disable the Create exception button if isReadOnly true', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={true}
        viewerStatus={ViewerStatus.EMPTY}
        onEmptyButtonStateClick={jest.fn()}
        listType={ListTypeText.ENDPOINT}
      />
    );

    const { getByTestId } = wrapper;
    expect(getByTestId('emptyViewerState')).toBeTruthy();
    expect(getByTestId('emptyTitle')).toHaveTextContent(i18n.EMPTY_VIEWER_STATE_EMPTY_TITLE);
    expect(getByTestId('emptyBody')).toHaveTextContent(i18n.EMPTY_VIEWER_STATE_EMPTY_BODY);
    expect(getByTestId('emptyStateButton')).toHaveTextContent(
      i18n.EMPTY_VIEWER_STATE_EMPTY_VIEWER_BUTTON(ListTypeText.ENDPOINT)
    );
    expect(getByTestId('emptyStateButton')).toBeDisabled();
  });
});

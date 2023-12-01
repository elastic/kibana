/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { isEqual } from 'lodash';
import { DocViewRenderTab } from './doc_viewer_render_tab';
import { DocViewerError } from './doc_viewer_error';
import type { DocViewRenderFn, DocViewRenderProps } from '../../types';

interface Props {
  id: string;
  renderProps: DocViewRenderProps;
  title: string;
  render?: DocViewRenderFn;
  component?: React.ComponentType<DocViewRenderProps>;
}

interface State {
  error: Error | string;
  hasError: boolean;
}
/**
 * Renders the tab content of a doc view.
 * Displays an error message when it encounters exceptions, thanks to
 * Error Boundaries.
 */
export class DocViewerTab extends React.Component<Props, State> {
  state = {
    hasError: false,
    error: '',
  };

  static getDerivedStateFromError(error: unknown) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return (
      nextProps.renderProps.hit.id !== this.props.renderProps.hit.id ||
      !isEqual(nextProps.renderProps.hit.raw.highlight, this.props.renderProps.hit.raw.highlight) ||
      nextProps.id !== this.props.id ||
      !isEqual(nextProps.renderProps.columns, this.props.renderProps.columns) ||
      nextState.hasError
    );
  }

  render() {
    const { component: Component, render, renderProps, title } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      return <DocViewerError error={error} />;
    }

    if (render) {
      // doc view is provided by a render function
      return <DocViewRenderTab render={render} renderProps={renderProps} />;
    }

    // doc view is provided by a react component
    if (Component) {
      return <Component {...renderProps} />;
    }

    return (
      <DocViewerError
        error={`Invalid plugin ${title}, there is neither a (react) component nor a render function provided`}
      />
    );
  }
}
